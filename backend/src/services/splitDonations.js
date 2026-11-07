// Split donations: one PayPal Orders v2 order with one purchase unit per
// campaign (reference_id = campaign id, custom_id = donation id). Each unit is
// its own donation row (paypal_order_id NULL, split_order_id set) and is
// credited through markDonationCompleted, so the capture endpoint and the
// PAYMENT.CAPTURE.COMPLETED webhook add it to its campaign exactly once.
import crypto from 'node:crypto';
import { actorFromUser, writeAudit } from '../audit.js';
import { tx } from '../db/index.js';
import { HttpError } from '../errors.js';
import { getCampaign, toDollars } from './campaigns.js';
import { MAX_DONATION, MIN_DONATION, centsFromValue, isValidAmount, mapDonation, markDonationCompleted } from './donations.js';

export const MAX_SPLIT_UNITS = 10;
export const MIN_SPLIT_UNITS = 2;

function splitDonationRows(db, splitId) {
  return db
    .prepare(
      `SELECT d.*, c.title AS campaign_title
         FROM donations d JOIN campaigns c ON c.id = d.campaign_id
        WHERE d.split_order_id = ?
        ORDER BY d.rowid`,
    )
    .all(splitId);
}

export function mapSplit(db, row) {
  return {
    id: row.id,
    orderId: row.paypal_order_id,
    status: row.status,
    total: toDollars(row.total_cents),
    currency: row.currency,
    aiSuggested: Boolean(row.ai_suggested),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    donations: splitDonationRows(db, row.id).map(mapDonation),
  };
}

// Derives the split status from its donation rows; writes only on change.
export function refreshSplitStatus(db, splitId) {
  const split = db.prepare('SELECT * FROM split_orders WHERE id = ?').get(splitId);
  if (!split) return null;
  const statuses = db.prepare('SELECT status FROM donations WHERE split_order_id = ?').all(splitId).map((r) => r.status);
  let status;
  if (statuses.length > 0 && statuses.every((s) => s === 'COMPLETED')) status = 'COMPLETED';
  else if (statuses.includes('COMPLETED')) status = 'PARTIALLY_COMPLETED';
  else if (statuses.includes('PENDING')) status = 'PENDING';
  else status = 'FAILED';
  if (status !== split.status) {
    db.prepare('UPDATE split_orders SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), splitId);
  }
  return status;
}

function invalidSplit(message) {
  return new HttpError(400, 'INVALID_SPLIT', message);
}

export async function createSplitOrder(db, paypal, config, { user, allocations, aiSuggested }) {
  if (!Array.isArray(allocations) || allocations.length < MIN_SPLIT_UNITS || allocations.length > MAX_SPLIT_UNITS) {
    throw invalidSplit(`Provide ${MIN_SPLIT_UNITS} to ${MAX_SPLIT_UNITS} allocations`);
  }
  const seen = new Set();
  for (const a of allocations) {
    if (!a || typeof a !== 'object' || typeof a.campaignId !== 'string' || a.campaignId === '') {
      throw invalidSplit('Each allocation needs a campaignId and an amount');
    }
    if (seen.has(a.campaignId)) throw invalidSplit('Each campaign may appear only once');
    seen.add(a.campaignId);
  }

  const units = [];
  let totalCents = 0;
  for (const a of allocations) {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(a.campaignId);
    if (!campaign) throw new HttpError(404, 'NOT_FOUND', `Campaign ${a.campaignId} not found`);
    if (campaign.status !== 'ACTIVE') {
      throw new HttpError(409, 'CAMPAIGN_NOT_ACTIVE', `Campaign ${a.campaignId} is not accepting donations`);
    }
    if (!isValidAmount(a.amount)) {
      throw new HttpError(400, 'INVALID_AMOUNT', `Each amount must be between ${MIN_DONATION} and ${MAX_DONATION} with at most 2 decimals`);
    }
    const cents = Math.round(a.amount * 100);
    totalCents += cents;
    units.push({ campaign, cents });
  }
  if (totalCents > MAX_DONATION * 100) {
    throw new HttpError(400, 'INVALID_AMOUNT', `The split total must not exceed ${MAX_DONATION}`);
  }
  if (!paypal?.isConfigured) {
    throw new HttpError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal credentials are not configured on the server');
  }

  const currency = config.paypal.currency;
  const splitId = 'SPL-' + crypto.randomUUID().slice(0, 8);
  const isAi = aiSuggested === true;
  const now = new Date().toISOString();
  for (const u of units) u.donationId = 'DON-' + crypto.randomUUID().slice(0, 8);

  tx(db, () => {
    db.prepare(
      `INSERT INTO split_orders (id, user_id, donor_name, total_cents, currency, status, ai_suggested, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
    ).run(splitId, user.id, user.name, totalCents, currency, isAi ? 1 : 0, now, now);
    const insert = db.prepare(
      `INSERT INTO donations (id, campaign_id, user_id, donor_name, amount_cents, currency, status, counted, split_order_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, ?)`,
    );
    for (const u of units) insert.run(u.donationId, u.campaign.id, user.id, user.name, u.cents, currency, splitId, now, now);
  });

  const actor = actorFromUser(user);
  const allocationDetails = units.map((u) => ({ campaignId: u.campaign.id, amount: u.cents / 100 }));
  let order;
  try {
    order = await paypal.createSplitOrder({
      units: units.map((u) => ({
        campaignId: u.campaign.id,
        donationId: u.donationId,
        description: `ReliefPay split donation: ${u.campaign.title}`,
        amount: (u.cents / 100).toFixed(2),
      })),
      currency,
      requestId: splitId,
    });
  } catch (err) {
    const failedAt = new Date().toISOString();
    tx(db, () => {
      db.prepare("UPDATE split_orders SET status = 'FAILED', updated_at = ? WHERE id = ?").run(failedAt, splitId);
      db.prepare("UPDATE donations SET status = 'FAILED', updated_at = ? WHERE split_order_id = ?").run(failedAt, splitId);
    });
    writeAudit(db, {
      actor,
      action: 'DONATION_SPLIT_ORDER_FAILED',
      target: `Split ${splitId}`,
      status: 'FAILED',
      details: { splitId, allocations: allocationDetails, paypalName: err.paypalName, debugId: err.debugId },
    });
    throw err;
  }

  db.prepare('UPDATE split_orders SET paypal_order_id = ?, updated_at = ? WHERE id = ?').run(order.id, new Date().toISOString(), splitId);
  writeAudit(db, {
    actor,
    action: 'DONATION_SPLIT_ORDER_CREATED',
    target: `Split ${splitId}`,
    status: 'RECORDED',
    details: { orderId: order.id, splitId, allocations: allocationDetails, total: totalCents / 100, aiSuggested: isAi },
  });
  return { orderId: order.id, splitId, donationIds: units.map((u) => u.donationId) };
}

function splitCampaigns(db, splitId) {
  const ids = [...new Set(splitDonationRows(db, splitId).map((d) => d.campaign_id))];
  return ids.map((id) => getCampaign(db, id));
}

export async function captureSplitOrder(db, paypal, { user, orderId }) {
  const split = db.prepare('SELECT * FROM split_orders WHERE paypal_order_id = ?').get(orderId);
  if (!split) throw new HttpError(404, 'NOT_FOUND', 'Split donation order not found');
  if (split.status === 'COMPLETED') {
    return { split: mapSplit(db, split), campaigns: splitCampaigns(db, split.id) };
  }

  const actor = actorFromUser(user);
  let result;
  try {
    result = await paypal.captureOrder(orderId, 'cap-' + split.id);
  } catch (err) {
    writeAudit(db, {
      actor,
      action: 'DONATION_SPLIT_CAPTURE_FAILED',
      target: `Split ${split.id}`,
      status: 'FAILED',
      details: { orderId, splitId: split.id, paypalName: err.paypalName ?? err.code, debugId: err.debugId },
    });
    throw err;
  }

  const rows = db.prepare('SELECT * FROM donations WHERE split_order_id = ?').all(split.id);
  const auditUnits = [];
  let completed = 0;
  for (const unit of result?.purchase_units ?? []) {
    const capture = unit?.payments?.captures?.[0];
    const donation =
      (capture?.custom_id && rows.find((d) => d.id === capture.custom_id)) ||
      (unit?.custom_id && rows.find((d) => d.id === unit.custom_id)) ||
      (unit?.reference_id && rows.find((d) => d.campaign_id === unit.reference_id));
    if (!donation) continue;

    const now = new Date().toISOString();
    let amountCents = donation.amount_cents;
    if (capture?.status === 'COMPLETED') {
      amountCents = centsFromValue(capture.amount?.value) ?? donation.amount_cents;
      markDonationCompleted(db, donation.id, { captureId: capture.id, amountCents });
      completed += 1;
    } else if (donation.status !== 'COMPLETED') {
      const newStatus = capture?.status === 'PENDING' ? 'PENDING' : 'FAILED';
      db.prepare('UPDATE donations SET status = ?, paypal_capture_id = COALESCE(?, paypal_capture_id), updated_at = ? WHERE id = ?').run(
        newStatus,
        capture?.id ?? null,
        now,
        donation.id,
      );
    }
    auditUnits.push({ campaignId: donation.campaign_id, captureId: capture?.id ?? null, status: capture?.status ?? null, amount: amountCents / 100 });
  }

  refreshSplitStatus(db, split.id);
  writeAudit(db, {
    actor,
    action: completed > 0 ? 'DONATION_SPLIT_CAPTURED' : 'DONATION_SPLIT_CAPTURE_FAILED',
    target: `Split ${split.id}`,
    status: completed > 0 ? 'VERIFIED' : 'FAILED',
    details: { orderId, splitId: split.id, orderStatus: result?.status, units: auditUnits },
  });

  const fresh = db.prepare('SELECT * FROM split_orders WHERE id = ?').get(split.id);
  return { split: mapSplit(db, fresh), campaigns: splitCampaigns(db, split.id) };
}
