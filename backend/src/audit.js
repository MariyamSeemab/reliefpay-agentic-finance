import crypto from 'node:crypto';

export const SYSTEM_ACTOR = Object.freeze({ id: 'system', label: 'ReliefPay System' });
export const PAYPAL_WEBHOOK_ACTOR = Object.freeze({ id: 'paypal-webhook', label: 'PayPal Webhook' });

export function actorFromUser(user) {
  return { id: user.id, label: `${user.name} (${user.role})` };
}

export function writeAudit(db, { actor, action, target, status = 'RECORDED', details }) {
  const id = 'LOG-' + crypto.randomUUID().slice(0, 8);
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO audit_logs (id, created_at, actor_id, actor_label, action, target, status, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    createdAt,
    actor?.id ?? null,
    actor?.label ?? SYSTEM_ACTOR.label,
    action,
    target ?? null,
    status,
    details === undefined ? null : JSON.stringify(details),
  );
  return id;
}

export function listAudit(db, { limit = 200 } = {}) {
  const rows = db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC, rowid DESC LIMIT ?')
    .all(limit);
  return rows.map((r) => ({
    id: r.id,
    actor: r.actor_label,
    action: r.action,
    target: r.target,
    timestamp: r.created_at,
    status: r.status,
    details: r.details_json ? JSON.parse(r.details_json) : null,
  }));
}
