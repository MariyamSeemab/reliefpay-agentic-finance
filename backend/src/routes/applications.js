import { Router } from 'express';
import { actorFromUser, writeAudit } from '../audit.js';
import { requireAuth, requireRole } from '../auth.js';
import { toDollars } from '../services/campaigns.js';
import { findActiveBatchItem } from '../services/payouts.js';

const REVIEW_STATUSES = ['APPROVED', 'REJECTED', 'DOCUMENT_REQUESTED', 'UNDER_REVIEW'];
const REMARKS_REQUIRED = ['REJECTED', 'DOCUMENT_REQUESTED'];
const TIMELINE_TITLES = {
  APPROVED: 'Application Approved',
  REJECTED: 'Application Rejected',
  DOCUMENT_REQUESTED: 'Additional Documents Requested',
  UNDER_REVIEW: 'Moved to Review',
};

function parseJson(text, fallback) {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

export function mapApplication(row, currency = 'USD') {
  return {
    id: row.id,
    beneficiaryName: row.beneficiary_name,
    phone: row.phone,
    campaignId: row.campaign_id,
    area: row.area,
    coordinates: [row.lat, row.lng],
    householdMembers: row.household_members,
    disasterType: row.disaster_type,
    requestedAmount: toDollars(row.requested_cents),
    approvedAmount: toDollars(row.approved_cents),
    priority: row.priority,
    status: row.status,
    submittedAt: row.submitted_at,
    aiFindings: parseJson(row.ai_findings_json, []),
    timeline: parseJson(row.timeline_json, []),
    documents: parseJson(row.documents_json, []),
    remarks: row.remarks,
    details: parseJson(row.details_json, {}),
    verification: parseJson(row.verification_json, {}),
    currency,
  };
}

const VERIFICATION_DECISIONS = ['REVIEWED', 'ESCALATED'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_REQUEST = 10;
const MAX_REQUEST = 10000;
const PRIORITY_BY_DAMAGE = { Total: 'CRITICAL', Severe: 'HIGH', Moderate: 'MEDIUM', Minimal: 'LOW' };

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Validates a beneficiary's new application. Returns { error } or { value }.
export function parseNewApplication(body) {
  const b = body ?? {};
  const campaignId = cleanText(b.campaignId, 64);
  const area = cleanText(b.area, 200);
  const disasterType = cleanText(b.disasterType, 80);
  const phone = cleanText(b.phone, 20);
  const paypalEmail = cleanText(b.paypalEmail, 254).toLowerCase();
  const amount = Number(b.requestedAmount);

  if (!campaignId) return { error: 'CAMPAIGN_REQUIRED' };
  if (!area) return { error: 'AREA_REQUIRED' };
  if (!disasterType) return { error: 'DISASTER_TYPE_REQUIRED' };
  if (!EMAIL_RE.test(paypalEmail)) return { error: 'INVALID_PAYPAL_EMAIL' };
  if (!Number.isFinite(amount) || amount < MIN_REQUEST || amount > MAX_REQUEST) {
    return { error: 'INVALID_AMOUNT', message: `Requested amount must be between $${MIN_REQUEST} and $${MAX_REQUEST}` };
  }

  const household = Number(b.householdMembers);
  const documents = Array.isArray(b.documents)
    ? b.documents.map((d) => cleanText(d, 120)).filter(Boolean).slice(0, 10)
    : [];
  const damageLevel = cleanText(b.damageLevel, 20);
  const estimatedDamage = Number(b.estimatedDamage);

  return {
    value: {
      campaignId,
      area,
      disasterType,
      phone,
      paypalEmail,
      requestedCents: Math.round(amount * 100),
      householdMembers: Number.isInteger(household) && household > 0 && household <= 50 ? household : null,
      priority: PRIORITY_BY_DAMAGE[damageLevel] ?? 'MEDIUM',
      documents,
      details: {
        emergencyType: cleanText(b.emergencyType, 80),
        assistanceCategory: cleanText(b.assistanceCategory, 80),
        damageLevel,
        estimatedDamage: Number.isFinite(estimatedDamage) && estimatedDamage >= 0 ? estimatedDamage : null,
        damageDescription: cleanText(b.damageDescription, 2000),
        justification: cleanText(b.justification, 2000),
      },
    },
  };
}

function nextApplicationId(db) {
  const year = new Date().getUTCFullYear();
  const prefix = `RPA-${year}-`;
  const rows = db.prepare('SELECT id FROM applications WHERE id LIKE ?').all(`${prefix}%`);
  const max = rows.reduce((m, r) => Math.max(m, Number(r.id.slice(prefix.length)) || 0), 0);
  return prefix + String(max + 1).padStart(4, '0');
}

export function applicationsRouter({ db, config }) {
  const router = Router();
  const auth = requireAuth(db, config);
  const currency = config.paypal.currency;

  router.get('/applications', auth, requireRole('ADMIN', 'REVIEWER', 'AUDITOR'), (req, res) => {
    const where = [];
    const params = [];
    for (const [query, column] of [['status', 'status'], ['priority', 'priority'], ['campaignId', 'campaign_id']]) {
      const value = req.query[query];
      if (typeof value === 'string' && value !== '') {
        where.push(`${column} = ?`);
        params.push(value);
      }
    }
    const sql = `SELECT * FROM applications ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`;
    const applications = db.prepare(sql).all(...params).map((r) => mapApplication(r, currency));
    res.json({ applications });
  });

  // A beneficiary sees only their own applications, so the dashboard shows the
  // reviewer's latest decision. Applications are linked to users by name.
  router.get('/applications/mine', auth, requireRole('BENEFICIARY'), (req, res) => {
    const applications = db
      .prepare('SELECT * FROM applications WHERE beneficiary_name = ? COLLATE NOCASE ORDER BY submitted_at DESC, id')
      .all(req.user.name)
      .map((r) => mapApplication(r, currency));
    res.json({ applications });
  });

  // A beneficiary submits a new application. It goes straight to the review
  // queue as UNDER_REVIEW and is linked to the beneficiary by account name.
  router.post('/applications', auth, requireRole('BENEFICIARY'), (req, res) => {
    const parsed = parseNewApplication(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error, message: parsed.message });
    const a = parsed.value;

    const campaign = db.prepare('SELECT id, status, lat, lng FROM campaigns WHERE id = ?').get(a.campaignId);
    if (!campaign) return res.status(400).json({ error: 'CAMPAIGN_NOT_FOUND' });
    if (campaign.status !== 'ACTIVE') return res.status(409).json({ error: 'CAMPAIGN_NOT_ACTIVE' });

    const now = new Date().toISOString();
    const actor = actorFromUser(req.user);
    const id = nextApplicationId(db);
    const timeline = [{ title: 'Application Submitted', date: now, actor: actor.label }];

    db.prepare(
      `INSERT INTO applications (id, beneficiary_name, phone, campaign_id, area, lat, lng, household_members,
         disaster_type, requested_cents, approved_cents, priority, status, paypal_email, submitted_at,
         ai_findings_json, timeline_json, documents_json, details_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'UNDER_REVIEW', ?, ?, '[]', ?, ?, ?, ?)`,
    ).run(
      id, req.user.name, a.phone || null, a.campaignId, a.area, campaign.lat, campaign.lng, a.householdMembers,
      a.disasterType, a.requestedCents, a.priority, a.paypalEmail, now,
      JSON.stringify(timeline), JSON.stringify(a.documents), JSON.stringify(a.details), now,
    );

    writeAudit(db, {
      actor,
      action: 'SUBMITTED_APPLICATION',
      target: `Application ${id}`,
      status: 'RECORDED',
      details: { campaignId: a.campaignId, requestedAmount: toDollars(a.requestedCents) },
    });

    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    return res.status(201).json({ application: mapApplication(row, currency) });
  });

  // Saves a reviewer's work on the AI Verification page: which AI findings are
  // reviewed or flagged, and the overall decision. It does not change the
  // application status; approving and rejecting stay on the review route.
  router.put('/applications/:id/verification', auth, requireRole('ADMIN', 'REVIEWER'), (req, res) => {
    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });

    const { reviewed, flagged, decision } = req.body ?? {};
    if (decision !== null && decision !== undefined && !VERIFICATION_DECISIONS.includes(decision)) {
      return res.status(400).json({ error: 'INVALID_DECISION' });
    }
    const findingIds = new Set(parseJson(row.ai_findings_json, []).map((f) => String(f.id)));
    const pick = (list) => [...new Set((Array.isArray(list) ? list : []).map(String))].filter((id) => findingIds.has(id));

    const actor = actorFromUser(req.user);
    const now = new Date().toISOString();
    const previous = parseJson(row.verification_json, {});
    const verification = {
      reviewed: pick(reviewed),
      flagged: pick(flagged),
      decision: decision ?? null,
      decidedAt: decision ? (decision === previous.decision ? previous.decidedAt : now) : null,
      decidedBy: decision ? (decision === previous.decision ? previous.decidedBy : actor.label) : null,
      updatedAt: now,
    };

    db.prepare('UPDATE applications SET verification_json = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(verification), now, row.id);

    let action = 'AI_FINDINGS_UPDATED';
    if (verification.decision !== (previous.decision ?? null)) {
      action = verification.decision ? `AI_VERIFICATION_${verification.decision}` : 'AI_VERIFICATION_CLEARED';
    }
    writeAudit(db, {
      actor,
      action,
      target: `Application ${row.id}`,
      status: 'VERIFIED',
      details: { reviewed: verification.reviewed.length, flagged: verification.flagged.length },
    });

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(row.id);
    return res.json({ application: mapApplication(updated, currency) });
  });

  router.patch('/applications/:id/status', auth, requireRole('ADMIN', 'REVIEWER'), (req, res) => {
    const { status, remarks, approvedAmount } = req.body ?? {};
    if (!REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'INVALID_STATUS' });
    }
    const cleanRemarks = typeof remarks === 'string' ? remarks.trim() : '';
    if (REMARKS_REQUIRED.includes(status) && cleanRemarks === '') {
      return res.status(400).json({ error: 'REMARKS_REQUIRED' });
    }

    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });

    let approvedCents = row.approved_cents;
    if (status === 'APPROVED') {
      if (approvedAmount !== undefined && approvedAmount !== null) {
        const amount = Number(approvedAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ error: 'INVALID_AMOUNT' });
        }
        approvedCents = Math.round(amount * 100);
      } else {
        approvedCents = row.requested_cents;
      }
      // A payout item keeps the amount it was drafted with, so changing the
      // approved amount here would make release pay a stale amount.
      const held = findActiveBatchItem(db, row.id);
      if (held && held.amount_cents !== approvedCents) {
        return res.status(409).json({
          error: 'APPLICATION_IN_BATCH',
          message: `Application is in payout batch ${held.batch_id} for ${toDollars(held.amount_cents)}; its approved amount cannot change`,
          batchId: held.batch_id,
        });
      }
    }

    const now = new Date().toISOString();
    const actor = actorFromUser(req.user);
    const timeline = parseJson(row.timeline_json, []);
    timeline.push({ title: TIMELINE_TITLES[status], date: now, actor: actor.label });

    db.prepare(
      `UPDATE applications
          SET status = ?, approved_cents = ?, remarks = ?, timeline_json = ?, updated_at = ?
        WHERE id = ?`,
    ).run(status, approvedCents, cleanRemarks || row.remarks, JSON.stringify(timeline), now, row.id);

    writeAudit(db, {
      actor,
      action: `APPLICATION_${status}`,
      target: `Application ${row.id}`,
      status: 'VERIFIED',
      details: { remarks: cleanRemarks || undefined, approvedAmount: toDollars(approvedCents) },
    });

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(row.id);
    return res.json({ application: mapApplication(updated, currency) });
  });

  return router;
}
