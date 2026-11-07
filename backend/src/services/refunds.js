// Refunds and reversals of captured donations. A refund lowers the campaign
// raised total exactly once, keyed by the PayPal refund id. Shared by the admin
// refund endpoint and the PAYMENT.CAPTURE.REFUNDED / REVERSED webhooks.
import { actorFromUser, writeAudit } from '../audit.js';
import { tx } from '../db/index.js';
import { HttpError } from '../errors.js';
import { getCampaign, toDollars } from './campaigns.js';
import { mapDonation } from './donations.js';

const CAPTURE_HREF = /\/v2\/payments\/captures\/([^/?#]+)/;

export function centsFromValue(value) {
  const n = Number(value);
  return value != null && value !== '' && Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

// Refund resources carry no supplementary_data; the capture they belong to is
// the links[rel=up] href (.../v2/payments/captures/<id>).
export function captureIdFromLinks(links) {
  if (!Array.isArray(links)) return null;
  for (const link of links) {
    if (link?.rel !== 'up' || typeof link.href !== 'string') continue;
    const m = CAPTURE_HREF.exec(link.href);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

export function mapRefund(row) {
  return {
    id: row.id,
    donationId: row.donation_id,
    captureId: row.capture_id,
    amount: toDollars(row.amount_cents),
    appliedAmount: toDollars(row.applied_cents),
    currency: row.currency,
    status: row.status,
    source: row.source,
    eventType: row.event_type,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const getDonation = (db, id) => db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
const getRefund = (db, id) => db.prepare('SELECT * FROM refunds WHERE id = ?').get(id);

// Records a refund and, once it is COMPLETED, subtracts it from the donation's
// campaign exactly once (never more than the donation's unrefunded amount).
export function applyRefund(db, { refundId, captureId, amountCents, currency, status, source, eventType, note, userId }) {
  return tx(db, () => {
    const donation = db.prepare('SELECT * FROM donations WHERE paypal_capture_id = ?').get(captureId);
    if (!donation) return { applied: 0, donation: null, refund: null };

    const now = new Date().toISOString();
    const existing = getRefund(db, refundId);
    if (!existing) {
      db.prepare(
        `INSERT INTO refunds (id, donation_id, capture_id, amount_cents, applied_cents, currency, status, source, event_type, note,
                              created_by_user_id, counted, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      ).run(
        refundId,
        donation.id,
        captureId,
        amountCents,
        currency || donation.currency,
        status || 'PENDING',
        source,
        eventType ?? null,
        typeof note === 'string' ? note : null,
        userId ?? null,
        now,
        now,
      );
    } else {
      db.prepare(
        `UPDATE refunds SET status = COALESCE(?, status), amount_cents = COALESCE(amount_cents, ?), updated_at = ? WHERE id = ?`,
      ).run(status ?? null, amountCents ?? null, now, refundId);
    }

    const row = getRefund(db, refundId);
    let applied = 0;
    if (row.status === 'COMPLETED' && donation.counted === 1 && row.counted === 0) {
      const remaining = donation.amount_cents - donation.refunded_cents;
      const apply = Math.max(0, Math.min(row.amount_cents, remaining));
      const marked = db
        .prepare('UPDATE refunds SET counted = 1, applied_cents = ?, updated_at = ? WHERE id = ? AND counted = 0')
        .run(apply, now, refundId);
      if (marked.changes === 1) {
        db.prepare('UPDATE donations SET refunded_cents = refunded_cents + ?, updated_at = ? WHERE id = ?').run(apply, now, donation.id);
        db.prepare('UPDATE campaigns SET raised_cents = raised_cents - ? WHERE id = ?').run(apply, donation.campaign_id);
        applied = apply;
      }
    }
    return { applied, donation: getDonation(db, donation.id), refund: getRefund(db, refundId) };
  });
}

function isValidRefundAmount(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return false;
  const cents = amount * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}

export async function refundDonation(db, paypal, config, { user, donationId, amount, note }) {
  const donation = getDonation(db, donationId);
  if (!donation) throw new HttpError(404, 'NOT_FOUND', 'Donation not found');
  if (donation.status !== 'COMPLETED' || donation.counted !== 1 || !donation.paypal_capture_id) {
    throw new HttpError(409, 'DONATION_NOT_REFUNDABLE', 'Only completed, captured donations can be refunded');
  }
  const remaining = donation.amount_cents - donation.refunded_cents;
  if (remaining <= 0) throw new HttpError(409, 'DONATION_NOT_REFUNDABLE', 'Donation is already fully refunded');
  if (amount !== undefined && !isValidRefundAmount(amount)) {
    throw new HttpError(400, 'INVALID_AMOUNT', 'Refund amount must be a number greater than 0 with at most 2 decimals');
  }
  const amountCents = amount === undefined ? remaining : Math.round(amount * 100);
  if (amountCents > remaining) {
    throw new HttpError(400, 'REFUND_EXCEEDS_REMAINING', `Refund amount exceeds the remaining ${(remaining / 100).toFixed(2)}`);
  }
  if (note !== undefined && (typeof note !== 'string' || note.length > 255)) {
    throw new HttpError(400, 'INVALID_NOTE', 'Note must be a string of at most 255 characters');
  }
  if (!paypal?.isConfigured) {
    throw new HttpError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal credentials are not configured on the server');
  }

  const captureId = donation.paypal_capture_id;
  const actor = actorFromUser(user);
  const target = `Donation ${donation.id}`;
  const requestId = `ref-${donation.id}-${donation.refunded_cents}-${amountCents}`;
  writeAudit(db, {
    actor,
    action: 'DONATION_REFUND_REQUESTED',
    target,
    status: 'RECORDED',
    details: { captureId, amount: amountCents / 100, full: amount === undefined },
  });

  let res;
  try {
    res = await paypal.refundCapture(captureId, {
      amount: amount === undefined ? undefined : (amountCents / 100).toFixed(2),
      currency: donation.currency,
      note,
      requestId,
    });
  } catch (err) {
    writeAudit(db, {
      actor,
      action: 'DONATION_REFUND_FAILED',
      target,
      status: 'FAILED',
      details: { captureId, amount: amountCents / 100, paypalName: err.paypalName ?? err.code, debugId: err.debugId },
    });
    throw err;
  }

  const result = applyRefund(db, {
    refundId: res.id,
    captureId,
    amountCents: centsFromValue(res.amount?.value) ?? amountCents,
    currency: res.amount?.currency_code ?? donation.currency,
    status: res.status,
    source: 'ADMIN',
    note,
    userId: user.id,
  });
  writeAudit(db, {
    actor,
    action: 'DONATION_REFUNDED',
    target,
    status: res.status === 'COMPLETED' ? 'VERIFIED' : 'RECORDED',
    details: { refundId: res.id, captureId, amount: result.refund.amount_cents / 100, status: res.status, applied: result.applied / 100 },
  });

  return {
    refund: mapRefund(result.refund),
    donation: mapDonation(result.donation),
    campaign: getCampaign(db, donation.campaign_id),
  };
}
