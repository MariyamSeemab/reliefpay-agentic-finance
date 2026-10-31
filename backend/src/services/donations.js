import crypto from 'node:crypto';
import { actorFromUser, writeAudit } from '../audit.js';
import { tx } from '../db/index.js';
import { HttpError } from '../errors.js';
import { getCampaign, toDollars } from './campaigns.js';

export const MIN_DONATION = 1;
export const MAX_DONATION = 10000;

export function mapDonation(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignTitle: row.campaign_title ?? undefined,
    donorName: row.donor_name,
    amount: toDollars(row.amount_cents),
    currency: row.currency,
    status: row.status,
    paypalOrderId: row.paypal_order_id,
    paypalCaptureId: row.paypal_capture_id,
    timestamp: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listDonations(db) {
  return db
    .prepare(
      `SELECT d.*, c.title AS campaign_title
         FROM donations d JOIN campaigns c ON c.id = d.campaign_id
        ORDER BY d.created_at DESC, d.rowid DESC`,
    )
    .all()
    .map(mapDonation);
}

function isValidAmount(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return false;
  if (amount < MIN_DONATION || amount > MAX_DONATION) return false;
  const cents = amount * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}

function centsFromValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function getDonation(db, id) {
  return db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
}

// Marks a donation COMPLETED and adds it to the campaign total exactly once.
// Shared by the capture endpoint and the PAYMENT.CAPTURE.COMPLETED webhook.
export function markDonationCompleted(db, donationId, { captureId, amountCents }) {
  return tx(db, () => {
    const now = new Date().toISOString();
    const current = getDonation(db, donationId);
    const cents = amountCents ?? current.amount_cents;
    db.prepare(
      `UPDATE donations
          SET status = 'COMPLETED', paypal_capture_id = COALESCE(?, paypal_capture_id), amount_cents = ?, updated_at = ?
        WHERE id = ?`,
    ).run(captureId ?? null, cents, now, donationId);
    const counted = db.prepare('UPDATE donations SET counted = 1 WHERE id = ? AND counted = 0').run(donationId);
    if (counted.changes === 1) {
      db.prepare('UPDATE campaigns SET raised_cents = raised_cents + ? WHERE id = ?').run(cents, current.campaign_id);
    }
    return getDonation(db, donationId);
  });
}

export async function createDonationOrder(db, paypal, config, { user, campaignId, amount }) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) throw new HttpError(404, 'NOT_FOUND', 'Campaign not found');
  if (campaign.status !== 'ACTIVE') throw new HttpError(409, 'CAMPAIGN_NOT_ACTIVE', 'Campaign is not accepting donations');
  if (!isValidAmount(amount)) {
    throw new HttpError(400, 'INVALID_AMOUNT', `Amount must be between ${MIN_DONATION} and ${MAX_DONATION} with at most 2 decimals`);
  }
  if (!paypal?.isConfigured) {
    throw new HttpError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal credentials are not configured on the server');
  }

  const currency = config.paypal.currency;
  const amountCents = Math.round(amount * 100);
  const donationId = 'DON-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO donations (id, campaign_id, user_id, donor_name, amount_cents, currency, status, counted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?)`,
  ).run(donationId, campaign.id, user.id, user.name, amountCents, currency, now, now);

  const actor = actorFromUser(user);
  let order;
  try {
    order = await paypal.createOrder({
      donationId,
      campaignId: campaign.id,
      description: `ReliefPay donation: ${campaign.title}`,
      amount: (amountCents / 100).toFixed(2),
      currency,
      requestId: donationId,
    });
  } catch (err) {
    db.prepare("UPDATE donations SET status = 'FAILED', updated_at = ? WHERE id = ?").run(new Date().toISOString(), donationId);
    writeAudit(db, {
      actor,
      action: 'DONATION_ORDER_FAILED',
      target: `Donation ${donationId}`,
      status: 'FAILED',
      details: { campaignId: campaign.id, amount: amountCents / 100, paypalName: err.paypalName, debugId: err.debugId },
    });
    throw err;
  }

  db.prepare('UPDATE donations SET paypal_order_id = ?, updated_at = ? WHERE id = ?').run(order.id, new Date().toISOString(), donationId);
  writeAudit(db, {
    actor,
    action: 'DONATION_ORDER_CREATED',
    target: `Donation ${donationId}`,
    status: 'RECORDED',
    details: { orderId: order.id, campaignId: campaign.id, amount: amountCents / 100, currency },
  });
  return { orderId: order.id, donationId };
}

export async function captureDonationOrder(db, paypal, { user, orderId }) {
  const donation = db.prepare('SELECT * FROM donations WHERE paypal_order_id = ?').get(orderId);
  if (!donation) throw new HttpError(404, 'NOT_FOUND', 'Donation order not found');
  if (donation.status === 'COMPLETED') {
    return { donation: mapDonation(donation), campaign: getCampaign(db, donation.campaign_id) };
  }

  const actor = actorFromUser(user);
  let result;
  try {
    result = await paypal.captureOrder(orderId, 'cap-' + donation.id);
  } catch (err) {
    writeAudit(db, {
      actor,
      action: 'DONATION_CAPTURE_FAILED',
      target: `Donation ${donation.id}`,
      status: 'FAILED',
      details: { orderId, paypalName: err.paypalName ?? err.code, debugId: err.debugId },
    });
    throw err;
  }

  const capture = result?.purchase_units?.[0]?.payments?.captures?.[0];
  let updated;
  if (result?.status === 'COMPLETED' && capture?.status === 'COMPLETED') {
    const amountCents = centsFromValue(capture.amount?.value) ?? donation.amount_cents;
    updated = markDonationCompleted(db, donation.id, { captureId: capture.id, amountCents });
    writeAudit(db, {
      actor,
      action: 'DONATION_CAPTURED',
      target: `Donation ${donation.id}`,
      status: 'VERIFIED',
      details: { orderId, captureId: capture.id, amount: amountCents / 100 },
    });
  } else {
    const newStatus = capture?.status === 'PENDING' ? 'PENDING' : 'FAILED';
    db.prepare('UPDATE donations SET status = ?, paypal_capture_id = COALESCE(?, paypal_capture_id), updated_at = ? WHERE id = ?').run(
      newStatus,
      capture?.id ?? null,
      new Date().toISOString(),
      donation.id,
    );
    updated = getDonation(db, donation.id);
    writeAudit(db, {
      actor,
      action: 'DONATION_CAPTURE_FAILED',
      target: `Donation ${donation.id}`,
      status: 'FAILED',
      details: { orderId, orderStatus: result?.status, captureStatus: capture?.status, captureId: capture?.id },
    });
  }

  return { donation: mapDonation(updated), campaign: getCampaign(db, donation.campaign_id) };
}
