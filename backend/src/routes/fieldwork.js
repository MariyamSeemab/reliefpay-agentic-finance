import { Router } from 'express';
import { actorFromUser, writeAudit } from '../audit.js';
import { requireAuth, requireRole } from '../auth.js';

// Volunteer field-check tasks and beneficiary profiles.

const MAX_EVIDENCE = 20;
const MAX_NOTES = 2000;

// Allowed status moves. COMPLETED -> IN_PROGRESS is "Reopen task".
const TRANSITIONS = {
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['IN_PROGRESS'],
};

function parseJson(text, fallback) {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

function mapTask(row) {
  return {
    id: row.id,
    volunteerUserId: row.volunteer_user_id,
    beneficiaryId: row.application_id,
    beneficiaryName: row.beneficiary_name,
    area: row.area,
    status: row.status,
    dueDate: row.due_date,
    notes: row.notes,
    fieldNotes: row.field_notes,
    evidence: parseJson(row.evidence_json, []),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

// Only file metadata is stored; the files themselves are not uploaded.
function cleanEvidence(list) {
  if (!Array.isArray(list)) return null;
  if (list.length > MAX_EVIDENCE) return null;
  const out = [];
  for (const f of list) {
    if (!f || typeof f.name !== 'string' || f.name.trim() === '') return null;
    const type = typeof f.type === 'string' ? f.type : '';
    if (!(type.startsWith('image/') || type === 'application/pdf')) return null;
    out.push({
      name: f.name.trim().slice(0, 200),
      size: Number.isFinite(Number(f.size)) ? Math.max(0, Math.round(Number(f.size))) : 0,
      type,
      addedAt: typeof f.addedAt === 'string' ? f.addedAt.slice(0, 40) : new Date().toISOString(),
    });
  }
  return out;
}

// Beneficiary profile fields from the registration form. Every value is a
// trimmed string with a length cap; numbers are validated separately.
const PROFILE_TEXT_FIELDS = {
  mobileNumber: 20,
  residentialAddress: 300,
  city: 100,
  state: 100,
  pinCode: 12,
  occupation: 100,
  emergencyContactName: 120,
  emergencyContactPhone: 20,
};
const PROFILE_NUMBER_FIELDS = { familySize: [1, 50], dependents: [0, 50], monthlyIncome: [0, 10000000] };
const PROFILE_REQUIRED = ['mobileNumber', 'residentialAddress', 'city', 'state', 'pinCode', 'familySize', 'emergencyContactName', 'emergencyContactPhone'];

export function parseProfile(body) {
  const b = body ?? {};
  const profile = {};
  for (const [field, max] of Object.entries(PROFILE_TEXT_FIELDS)) {
    profile[field] = typeof b[field] === 'string' ? b[field].trim().slice(0, max) : '';
  }
  for (const [field, [min, max]] of Object.entries(PROFILE_NUMBER_FIELDS)) {
    if (b[field] === '' || b[field] === undefined || b[field] === null) {
      profile[field] = null;
      continue;
    }
    const n = Number(b[field]);
    if (!Number.isFinite(n) || n < min || n > max) return { error: 'INVALID_FIELD', field };
    profile[field] = n;
  }
  const missing = PROFILE_REQUIRED.find((f) => profile[f] === '' || profile[f] === null);
  if (missing) return { error: 'FIELD_REQUIRED', field: missing };
  if (!/^\+?[0-9]{10,15}$/.test(profile.mobileNumber.replace(/[\s-]/g, ''))) return { error: 'INVALID_FIELD', field: 'mobileNumber' };
  if (!/^\+?[0-9]{10,15}$/.test(profile.emergencyContactPhone.replace(/[\s-]/g, ''))) {
    return { error: 'INVALID_FIELD', field: 'emergencyContactPhone' };
  }
  return { value: profile };
}

export function fieldworkRouter({ db, config }) {
  const router = Router();
  const auth = requireAuth(db, config);

  // A volunteer sees their own tasks; an admin sees every task.
  router.get('/volunteer/tasks', auth, requireRole('VOLUNTEER', 'ADMIN'), (req, res) => {
    const rows = req.user.role === 'ADMIN'
      ? db.prepare('SELECT * FROM volunteer_tasks ORDER BY due_date, id').all()
      : db.prepare('SELECT * FROM volunteer_tasks WHERE volunteer_user_id = ? ORDER BY due_date, id').all(req.user.id);
    res.json({ tasks: rows.map(mapTask) });
  });

  // The assigned volunteer updates status, field notes or evidence.
  router.patch('/volunteer/tasks/:id', auth, requireRole('VOLUNTEER'), (req, res) => {
    const row = db.prepare('SELECT * FROM volunteer_tasks WHERE id = ?').get(req.params.id);
    if (!row || row.volunteer_user_id !== req.user.id) return res.status(404).json({ error: 'NOT_FOUND' });

    const { status, fieldNotes, evidence } = req.body ?? {};
    let nextEvidence = parseJson(row.evidence_json, []);
    if (evidence !== undefined) {
      const cleaned = cleanEvidence(evidence);
      if (!cleaned) return res.status(400).json({ error: 'INVALID_EVIDENCE' });
      nextEvidence = cleaned;
    }
    let nextNotes = row.field_notes;
    if (fieldNotes !== undefined) {
      if (typeof fieldNotes !== 'string') return res.status(400).json({ error: 'INVALID_NOTES' });
      nextNotes = fieldNotes.trim().slice(0, MAX_NOTES);
    }

    const now = new Date().toISOString();
    let nextStatus = row.status;
    let startedAt = row.started_at;
    let completedAt = row.completed_at;
    if (status !== undefined && status !== row.status) {
      if (!(TRANSITIONS[row.status] ?? []).includes(status)) {
        return res.status(409).json({ error: 'INVALID_TRANSITION', message: `Cannot move a task from ${row.status} to ${status}` });
      }
      if (status === 'COMPLETED' && nextEvidence.length === 0) {
        return res.status(409).json({ error: 'EVIDENCE_REQUIRED', message: 'Upload at least one evidence file first' });
      }
      nextStatus = status;
      if (status === 'IN_PROGRESS') {
        startedAt = startedAt || now;
        completedAt = null;
      }
      if (status === 'COMPLETED') completedAt = now;
    }

    db.prepare(
      `UPDATE volunteer_tasks SET status = ?, field_notes = ?, evidence_json = ?, started_at = ?, completed_at = ?, updated_at = ?
        WHERE id = ?`,
    ).run(nextStatus, nextNotes, JSON.stringify(nextEvidence), startedAt, completedAt, now, row.id);

    if (nextStatus !== row.status) {
      const action = nextStatus === 'COMPLETED' ? 'FIELD_TASK_COMPLETED' : row.status === 'COMPLETED' ? 'FIELD_TASK_REOPENED' : 'FIELD_TASK_STARTED';
      writeAudit(db, {
        actor: actorFromUser(req.user),
        action,
        target: `Task ${row.id}`,
        status: 'RECORDED',
        details: { applicationId: row.application_id, evidenceFiles: nextEvidence.length },
      });
    }

    return res.json({ task: mapTask(db.prepare('SELECT * FROM volunteer_tasks WHERE id = ?').get(row.id)) });
  });

  // Beneficiary profile from the registration form.
  router.get('/beneficiary/profile', auth, requireRole('BENEFICIARY'), (req, res) => {
    const row = db.prepare('SELECT * FROM beneficiary_profiles WHERE user_id = ?').get(req.user.id);
    res.json({ profile: row ? parseJson(row.profile_json, {}) : null, updatedAt: row?.updated_at ?? null });
  });

  router.put('/beneficiary/profile', auth, requireRole('BENEFICIARY'), (req, res) => {
    const parsed = parseProfile(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error, field: parsed.field });
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT user_id FROM beneficiary_profiles WHERE user_id = ?').get(req.user.id);
    db.prepare(
      `INSERT INTO beneficiary_profiles (user_id, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at`,
    ).run(req.user.id, JSON.stringify(parsed.value), now, now);
    writeAudit(db, {
      actor: actorFromUser(req.user),
      action: existing ? 'BENEFICIARY_PROFILE_UPDATED' : 'BENEFICIARY_REGISTERED',
      target: `User ${req.user.id}`,
      status: 'RECORDED',
    });
    return res.json({ profile: parsed.value, updatedAt: now });
  });

  return router;
}
