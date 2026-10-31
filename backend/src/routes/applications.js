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
    currency,
  };
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
