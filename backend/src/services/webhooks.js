import { PAYPAL_WEBHOOK_ACTOR, writeAudit } from '../audit.js';
import { HttpError } from '../errors.js';
import { markDonationCompleted } from './donations.js';
import { applyPayoutBatchStatus, applyPayoutItemStatus } from './payouts.js';

const CAPTURE_FAILED_EVENTS = ['PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.DECLINED'];
const BATCH_EVENTS = ['PAYMENT.PAYOUTSBATCH.SUCCESS', 'PAYMENT.PAYOUTSBATCH.DENIED', 'PAYMENT.PAYOUTSBATCH.PROCESSING'];
const ITEM_EVENTS = [
  'PAYMENT.PAYOUTS-ITEM.SUCCEEDED',
  'PAYMENT.PAYOUTS-ITEM.FAILED',
  'PAYMENT.PAYOUTS-ITEM.BLOCKED',
  'PAYMENT.PAYOUTS-ITEM.CANCELED',
  'PAYMENT.PAYOUTS-ITEM.HELD',
  'PAYMENT.PAYOUTS-ITEM.REFUNDED',
  'PAYMENT.PAYOUTS-ITEM.RETURNED',
  'PAYMENT.PAYOUTS-ITEM.UNCLAIMED',
];

function reject(db, details, status = 'REJECTED') {
  writeAudit(db, { actor: PAYPAL_WEBHOOK_ACTOR, action: 'WEBHOOK_REJECTED', target: 'PayPal webhook', status, details });
}

function findDonationForCapture(db, resource) {
  const byCapture = resource?.id && db.prepare('SELECT * FROM donations WHERE paypal_capture_id = ?').get(resource.id);
  if (byCapture) return byCapture;
  const byId = resource?.custom_id && db.prepare('SELECT * FROM donations WHERE id = ?').get(resource.custom_id);
  if (byId) return byId;
  const orderId = resource?.supplementary_data?.related_ids?.order_id;
  return (orderId && db.prepare('SELECT * FROM donations WHERE paypal_order_id = ?').get(orderId)) || null;
}

function centsFromValue(value) {
  const n = Number(value);
  return value != null && Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

function dispatch(db, event) {
  const type = event.event_type;
  const resource = event.resource ?? {};

  if (type === 'PAYMENT.CAPTURE.COMPLETED') {
    const donation = findDonationForCapture(db, resource);
    if (donation) markDonationCompleted(db, donation.id, { captureId: resource.id, amountCents: centsFromValue(resource.amount?.value) });
  } else if (CAPTURE_FAILED_EVENTS.includes(type)) {
    const donation = findDonationForCapture(db, resource);
    if (donation && donation.status !== 'COMPLETED') {
      db.prepare("UPDATE donations SET status = 'FAILED', updated_at = ? WHERE id = ?").run(new Date().toISOString(), donation.id);
    }
  } else if (BATCH_EVENTS.includes(type)) {
    applyPayoutBatchStatus(db, resource.batch_header?.payout_batch_id, resource.batch_header?.batch_status);
  } else if (ITEM_EVENTS.includes(type)) {
    applyPayoutItemStatus(db, {
      senderItemId: resource.payout_item?.sender_item_id,
      payoutItemId: resource.payout_item_id,
      transactionStatus: resource.transaction_status,
      transactionId: resource.transaction_id,
      errors: resource.errors,
    });
  }
  // Any other event type is recorded only.
}

export async function handlePayPalWebhook(db, paypal, config, { headers, event }) {
  if (!config.paypal.webhookId || !paypal?.isConfigured) {
    reject(db, { reason: 'WEBHOOK_NOT_CONFIGURED' });
    throw new HttpError(503, 'WEBHOOK_NOT_CONFIGURED', 'PayPal webhook verification is not configured');
  }
  if (!event || typeof event !== 'object' || typeof event.id !== 'string' || typeof event.event_type !== 'string') {
    reject(db, { reason: 'INVALID_EVENT' });
    throw new HttpError(400, 'INVALID_EVENT', 'Webhook body is not a PayPal event');
  }

  let verification;
  try {
    verification = await paypal.verifyWebhookSignature({ headers, webhookId: config.paypal.webhookId, event });
  } catch (err) {
    reject(db, { reason: 'VERIFY_CALL_FAILED', eventId: event.id, paypalName: err.paypalName, debugId: err.debugId }, 'FAILED');
    throw err;
  }
  if (verification !== 'SUCCESS') {
    reject(db, { reason: 'INVALID_SIGNATURE', eventId: event.id, eventType: event.event_type, verificationStatus: verification ?? null });
    throw new HttpError(400, 'INVALID_SIGNATURE', 'Webhook signature verification failed');
  }

  // Everything below is synchronous, so no other request interleaves.
  const existing = db.prepare('SELECT processed FROM webhook_events WHERE id = ?').get(event.id);
  if (existing?.processed === 1) return { received: true, duplicate: true };
  if (!existing) {
    db.prepare('INSERT INTO webhook_events (id, event_type, received_at, verification_status, processed) VALUES (?, ?, ?, ?, 0)').run(
      event.id,
      event.event_type,
      new Date().toISOString(),
      verification,
    );
  }

  dispatch(db, event);

  const resource = event.resource ?? {};
  writeAudit(db, {
    actor: PAYPAL_WEBHOOK_ACTOR,
    action: 'WEBHOOK_' + event.event_type.replace(/[.-]/g, '_'),
    target: `PayPal event ${event.id}`,
    status: 'VERIFIED',
    details: { eventId: event.id, resourceId: resource.id ?? resource.payout_item_id ?? resource.batch_header?.payout_batch_id ?? null },
  });
  db.prepare('UPDATE webhook_events SET processed = 1 WHERE id = ?').run(event.id);
  return { received: true };
}
