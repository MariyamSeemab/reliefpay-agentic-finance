import crypto from 'node:crypto';
import { actorFromUser, writeAudit } from '../audit.js';
import { tx } from '../db/index.js';
import { HttpError } from '../errors.js';
import { campaignAvailableCents, toDollars } from './campaigns.js';

export const MAX_BATCH_ITEMS = 50;
const MAX_FAILED_AUTH_ATTEMPTS = 5;
// A batch in one of these states no longer holds its applications. A
// RELEASE_FAILED batch keeps holding them: PayPal may have accepted it before
// the error, so it must be retried under the same sender_batch_id (which
// PayPal deduplicates) instead of being re-drafted into a new batch.
const INACTIVE_BATCH_STATUSES = ['DENIED', 'CANCELED'];
const RELEASABLE_STATUSES = ['DRAFT', 'RELEASE_FAILED'];
const PAYPAL_BATCH_STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'DENIED', 'CANCELED'];
const TERMINAL_BATCH_STATUSES = ['SUCCESS', 'DENIED', 'CANCELED'];
// PayPal transaction_status -> payout_items.status.
const ITEM_STATUS_MAP = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  UNCLAIMED: 'UNCLAIMED',
  RETURNED: 'RETURNED',
  ONHOLD: 'ONHOLD',
  BLOCKED: 'BLOCKED',
  REFUNDED: 'REFUNDED',
  REVERSED: 'REVERSED',
};

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email ?? null;
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function getBatchRow(db, id) {
  return db.prepare('SELECT * FROM payout_batches WHERE id = ?').get(id);
}

function getItems(db, batchId) {
  return db
    .prepare(
      `SELECT pi.*, a.beneficiary_name, a.priority, a.status AS application_status
         FROM payout_items pi JOIN applications a ON a.id = pi.application_id
        WHERE pi.batch_id = ? ORDER BY pi.rowid`,
    )
    .all(batchId);
}

export function mapBatch(db, row) {
  const items = getItems(db, row.id);
  const campaign = db.prepare('SELECT title FROM campaigns WHERE id = ?').get(row.campaign_id);
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignTitle: campaign?.title ?? null,
    status: row.status,
    totalAmount: toDollars(row.total_cents),
    currency: row.currency,
    note: row.note,
    beneficiaryCount: items.length,
    draftedByAi: Boolean(row.drafted_by_ai),
    failedAuthAttempts: row.failed_auth_attempts,
    paypalBatchId: row.paypal_batch_id,
    createdByUserId: row.created_by_user_id,
    releasedByUserId: row.released_by_user_id,
    releasedAt: row.released_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((i) => ({
      id: i.id,
      applicationId: i.application_id,
      beneficiaryName: i.beneficiary_name,
      priority: i.priority,
      amount: toDollars(i.amount_cents),
      status: i.status,
      receiverEmail: maskEmail(i.receiver_email),
      paypalItemId: i.paypal_item_id,
      transactionId: i.paypal_transaction_id,
      error: i.error,
    })),
  };
}

export function listPayoutBatches(db) {
  return db
    .prepare('SELECT * FROM payout_batches ORDER BY created_at DESC, rowid DESC')
    .all()
    .map((r) => mapBatch(db, r));
}

export function getPayoutBatch(db, id) {
  const row = getBatchRow(db, id);
  return row ? mapBatch(db, row) : null;
}

function batchTarget(id) {
  return `Payout batch ${id}`;
}

// The payout item that currently holds an application, if any.
export function findActiveBatchItem(db, applicationId) {
  const inactive = INACTIVE_BATCH_STATUSES.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT pi.id, pi.batch_id, pi.amount_cents FROM payout_items pi JOIN payout_batches pb ON pb.id = pi.batch_id
        WHERE pi.application_id = ? AND pb.status NOT IN (${inactive}) LIMIT 1`,
    )
    .get(applicationId, ...INACTIVE_BATCH_STATUSES);
}

export function draftPayoutBatch(db, config, { actor, userId, campaignId, applicationIds, note, draftedByAi = false }) {
  if (!Array.isArray(applicationIds) || applicationIds.length < 1 || applicationIds.length > MAX_BATCH_ITEMS) {
    throw new HttpError(400, 'INVALID_APPLICATIONS', `Provide 1 to ${MAX_BATCH_ITEMS} application ids`);
  }
  if (!applicationIds.every((id) => typeof id === 'string' && id !== '')) {
    throw new HttpError(400, 'INVALID_APPLICATIONS', 'Application ids must be non-empty strings');
  }
  if (new Set(applicationIds).size !== applicationIds.length) {
    throw new HttpError(400, 'DUPLICATE_APPLICATIONS', 'Application ids must be unique');
  }
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) throw new HttpError(404, 'NOT_FOUND', 'Campaign not found');

  const findApp = db.prepare('SELECT * FROM applications WHERE id = ?');

  const reasons = {};
  const apps = [];
  for (const id of applicationIds) {
    const app = findApp.get(id);
    if (!app) reasons[id] = 'NOT_FOUND';
    else if (app.campaign_id !== campaignId) reasons[id] = 'WRONG_CAMPAIGN';
    else if (app.status !== 'APPROVED') reasons[id] = `STATUS_${app.status}`;
    else if (!(app.approved_cents > 0)) reasons[id] = 'NO_APPROVED_AMOUNT';
    else if (!app.paypal_email) reasons[id] = 'NO_PAYPAL_EMAIL';
    else {
      const other = findActiveBatchItem(db, id);
      if (other) reasons[id] = `IN_BATCH_${other.batch_id}`;
      else apps.push(app);
    }
  }
  const offendingIds = Object.keys(reasons);
  if (offendingIds.length > 0) {
    throw new HttpError(409, 'APPLICATIONS_NOT_ELIGIBLE', 'Some applications cannot be paid out', { offendingIds, reasons });
  }

  const totalCents = apps.reduce((sum, a) => sum + a.approved_cents, 0);
  const availableCents = campaignAvailableCents(db, campaignId);
  if (totalCents > availableCents) {
    throw new HttpError(409, 'INSUFFICIENT_FUNDS', 'Batch total exceeds available campaign funds', {
      totalAmount: toDollars(totalCents),
      availableAmount: toDollars(availableCents),
    });
  }

  const batchId = 'PB-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const cleanNote = typeof note === 'string' ? note.trim().slice(0, 500) : null;
  tx(db, () => {
    db.prepare(
      `INSERT INTO payout_batches (id, campaign_id, status, total_cents, currency, note, created_by_user_id, drafted_by_ai, created_at, updated_at)
       VALUES (?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(batchId, campaignId, totalCents, config.paypal.currency, cleanNote || null, userId ?? null, draftedByAi ? 1 : 0, now, now);
    const insertItem = db.prepare(
      `INSERT INTO payout_items (id, batch_id, application_id, receiver_email, amount_cents, status, updated_at)
       VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)`,
    );
    for (const app of apps) {
      insertItem.run('PI-' + crypto.randomUUID().slice(0, 8), batchId, app.id, app.paypal_email, app.approved_cents, now);
    }
    writeAudit(db, {
      actor,
      action: 'PAYOUT_DRAFTED',
      target: batchTarget(batchId),
      status: 'RECORDED',
      details: { campaignId, applicationIds, totalAmount: toDollars(totalCents), drafted_by_ai: Boolean(draftedByAi) },
    });
  });
  return getPayoutBatch(db, batchId);
}

function codesMatch(provided, expected) {
  const a = crypto.createHash('sha256').update(String(provided ?? '')).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

// The only code path that sends money: POST /v1/payments/payouts.
export async function releasePayoutBatch(db, paypal, config, { user, batchId, authCode }) {
  if (user?.role !== 'ADMIN') throw new HttpError(403, 'FORBIDDEN', 'Only an ADMIN can release payouts');
  if (!config.payoutAuthCode) {
    throw new HttpError(503, 'PAYOUT_AUTH_NOT_CONFIGURED', 'PAYOUT_AUTH_CODE is not configured on the server');
  }
  if (!paypal?.isConfigured) {
    throw new HttpError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal credentials are not configured on the server');
  }
  const batch = getBatchRow(db, batchId);
  if (!batch) throw new HttpError(404, 'NOT_FOUND', 'Payout batch not found');
  if (!RELEASABLE_STATUSES.includes(batch.status)) {
    throw new HttpError(409, 'BATCH_NOT_RELEASABLE', `Batch is ${batch.status}`);
  }
  if (batch.failed_auth_attempts >= MAX_FAILED_AUTH_ATTEMPTS) {
    throw new HttpError(423, 'BATCH_LOCKED', 'Too many failed authorization attempts for this batch');
  }

  const actor = actorFromUser(user);
  if (!codesMatch(authCode, config.payoutAuthCode)) {
    db.prepare('UPDATE payout_batches SET failed_auth_attempts = failed_auth_attempts + 1, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      batch.id,
    );
    writeAudit(db, {
      actor,
      action: 'PAYOUT_RELEASE_REJECTED',
      target: batchTarget(batch.id),
      status: 'REJECTED',
      details: { reason: 'INVALID_AUTH_CODE', failedAttempts: batch.failed_auth_attempts + 1 },
    });
    throw new HttpError(403, 'INVALID_AUTH_CODE', 'Authorization code is incorrect');
  }

  const items = getItems(db, batch.id);
  const notApproved = items.filter((i) => i.application_status !== 'APPROVED').map((i) => i.application_id);
  if (items.length === 0 || notApproved.length > 0) {
    throw new HttpError(409, 'APPLICATIONS_NOT_ELIGIBLE', 'Some applications are no longer approved', { offendingIds: notApproved });
  }
  const totalCents = items.reduce((sum, i) => sum + i.amount_cents, 0);
  const availableCents = campaignAvailableCents(db, batch.campaign_id);
  if (totalCents > availableCents) {
    throw new HttpError(409, 'INSUFFICIENT_FUNDS', 'Batch total exceeds available campaign funds', {
      totalAmount: toDollars(totalCents),
      availableAmount: toDollars(availableCents),
    });
  }

  tx(db, () => {
    const now = new Date().toISOString();
    db.prepare("UPDATE payout_batches SET status = 'RELEASING', updated_at = ? WHERE id = ?").run(now, batch.id);
    db.prepare("UPDATE payout_items SET status = 'PENDING', error = NULL, updated_at = ? WHERE batch_id = ?").run(now, batch.id);
  });

  const campaign = db.prepare('SELECT title FROM campaigns WHERE id = ?').get(batch.campaign_id);
  let res;
  try {
    res = await paypal.createPayoutBatch({
      senderBatchId: batch.id,
      emailSubject: 'You have received ReliefPay disaster relief funds',
      emailMessage: `Relief payment from the campaign "${campaign?.title ?? batch.campaign_id}".`,
      items: items.map((i) => ({
        senderItemId: i.id,
        receiver: config.payoutReceiverEmail || i.receiver_email,
        amount: (i.amount_cents / 100).toFixed(2),
        currency: batch.currency,
        note: `ReliefPay relief payment for application ${i.application_id}`,
      })),
    });
  } catch (err) {
    tx(db, () => {
      const now = new Date().toISOString();
      db.prepare("UPDATE payout_batches SET status = 'RELEASE_FAILED', updated_at = ? WHERE id = ?").run(now, batch.id);
      db.prepare("UPDATE payout_items SET status = 'DRAFT', updated_at = ? WHERE batch_id = ?").run(now, batch.id);
      writeAudit(db, {
        actor,
        action: 'PAYOUT_RELEASE_FAILED',
        target: batchTarget(batch.id),
        status: 'FAILED',
        details: { name: err.paypalName ?? err.code ?? err.name, debugId: err.debugId, httpStatus: err.status },
      });
    });
    throw new HttpError(502, 'PAYPAL_PAYOUT_FAILED', 'PayPal rejected the payout batch', {
      paypalName: err.paypalName ?? null,
      debugId: err.debugId ?? null,
    });
  }

  const paypalBatchId = res?.batch_header?.payout_batch_id ?? null;
  const reported = res?.batch_header?.batch_status;
  const status = PAYPAL_BATCH_STATUSES.includes(reported) ? reported : 'PENDING';
  tx(db, () => {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE payout_batches
          SET status = ?, paypal_batch_id = ?, released_by_user_id = ?, released_at = ?, updated_at = ?
        WHERE id = ?`,
    ).run(status, paypalBatchId, user.id, now, now, batch.id);
    writeAudit(db, {
      actor,
      action: 'PAYOUT_RELEASED',
      target: batchTarget(batch.id),
      status: 'VERIFIED',
      details: { paypalBatchId, batchStatus: reported, totalAmount: toDollars(totalCents), itemCount: items.length },
    });
  });
  return getPayoutBatch(db, batch.id);
}

// Shared by sync and webhooks. Ignores unknown statuses and never moves a
// batch out of a terminal state.
export function applyPayoutBatchStatus(db, paypalBatchId, status) {
  if (!paypalBatchId || !PAYPAL_BATCH_STATUSES.includes(status)) return null;
  const batch = db.prepare('SELECT * FROM payout_batches WHERE paypal_batch_id = ?').get(paypalBatchId);
  if (!batch) return null;
  if (TERMINAL_BATCH_STATUSES.includes(batch.status) || batch.status === status) return batch;
  tx(db, () => {
    const now = new Date().toISOString();
    db.prepare('UPDATE payout_batches SET status = ?, updated_at = ? WHERE id = ?').run(status, now, batch.id);
    if (status === 'DENIED' || status === 'CANCELED') {
      // Release the reservation held by items PayPal will never pay.
      db.prepare("UPDATE payout_items SET status = ?, updated_at = ? WHERE batch_id = ? AND status = 'PENDING'").run(status, now, batch.id);
    }
  });
  return getBatchRow(db, batch.id);
}

// Shared by sync and webhooks. On SUCCESS the item amount is added to the
// campaign's disbursed total exactly once (counted flag).
export function applyPayoutItemStatus(db, { senderItemId, payoutItemId, transactionStatus, transactionId, errors }) {
  let item = senderItemId ? db.prepare('SELECT * FROM payout_items WHERE id = ?').get(senderItemId) : undefined;
  if (!item && payoutItemId) item = db.prepare('SELECT * FROM payout_items WHERE paypal_item_id = ?').get(payoutItemId);
  if (!item) return null;
  const status = ITEM_STATUS_MAP[transactionStatus];
  if (!status) return item;

  let errorText = null;
  if (errors) errorText = typeof errors === 'string' ? errors : errors.message || errors.name || JSON.stringify(errors);

  return tx(db, () => {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE payout_items
          SET status = ?, paypal_item_id = COALESCE(?, paypal_item_id), paypal_transaction_id = COALESCE(?, paypal_transaction_id),
              error = ?, updated_at = ?
        WHERE id = ?`,
    ).run(status, payoutItemId ?? null, transactionId ?? null, errorText, now, item.id);
    if (status === 'SUCCESS') {
      const counted = db.prepare('UPDATE payout_items SET counted = 1 WHERE id = ? AND counted = 0').run(item.id);
      if (counted.changes === 1) {
        const batch = getBatchRow(db, item.batch_id);
        db.prepare('UPDATE campaigns SET disbursed_cents = disbursed_cents + ? WHERE id = ?').run(item.amount_cents, batch.campaign_id);
      }
    }
    return db.prepare('SELECT * FROM payout_items WHERE id = ?').get(item.id);
  });
}

export async function syncPayoutBatch(db, paypal, { actor, batchId }) {
  const batch = getBatchRow(db, batchId);
  if (!batch) throw new HttpError(404, 'NOT_FOUND', 'Payout batch not found');
  if (!batch.paypal_batch_id) throw new HttpError(409, 'BATCH_NOT_RELEASED', 'Batch has not been released to PayPal');
  if (!paypal?.isConfigured) {
    throw new HttpError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal credentials are not configured on the server');
  }

  const res = await paypal.getPayoutBatch(batch.paypal_batch_id);
  const batchStatus = res?.batch_header?.batch_status;
  applyPayoutBatchStatus(db, batch.paypal_batch_id, batchStatus);
  for (const entry of res?.items ?? []) {
    applyPayoutItemStatus(db, {
      senderItemId: entry.payout_item?.sender_item_id,
      payoutItemId: entry.payout_item_id,
      transactionStatus: entry.transaction_status,
      transactionId: entry.transaction_id,
      errors: entry.errors,
    });
  }
  writeAudit(db, {
    actor,
    action: 'PAYOUT_SYNCED',
    target: batchTarget(batch.id),
    status: 'VERIFIED',
    details: { paypalBatchId: batch.paypal_batch_id, batchStatus, itemCount: res?.items?.length ?? 0 },
  });
  return getPayoutBatch(db, batch.id);
}
