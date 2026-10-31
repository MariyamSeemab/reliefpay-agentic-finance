import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { loginAs, makeTestContext } from './helpers.js';
import { makeFakePayPal } from './paypal-fake.js';

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const PAYPAL_HEADERS = {
  'PAYPAL-AUTH-ALGO': 'SHA256withRSA',
  'PAYPAL-CERT-URL': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test',
  'PAYPAL-TRANSMISSION-ID': 'tx-id-1',
  'PAYPAL-TRANSMISSION-SIG': 'sig-value',
  'PAYPAL-TRANSMISSION-TIME': '2026-10-30T10:00:00Z',
};

let ctx;
let fake;
let paypalBatchId;

beforeEach(async () => {
  fake = makeFakePayPal();
  ctx = makeTestContext({ paypalFetch: fake.fetch });
  const admin = await loginAs(ctx.app, 'alok.v@reliefpay.org');
  const res = await request(ctx.app).post('/api/payouts/PB-SEED-001/release').set(bearer(admin)).send({ authCode: '246810' });
  assert.equal(res.status, 200);
  paypalBatchId = res.body.batch.paypalBatchId;
});

const post = (event) => request(ctx.app).post('/api/webhooks/paypal').set(PAYPAL_HEADERS).send(event);
const item = (id) => ctx.db.prepare('SELECT * FROM payout_items WHERE id = ?').get(id);
const disbursed = () => ctx.db.prepare("SELECT disbursed_cents FROM campaigns WHERE id = 'cmp-01'").get().disbursed_cents;
const raised = () => ctx.db.prepare("SELECT raised_cents FROM campaigns WHERE id = 'cmp-01'").get().raised_cents;

function itemSucceeded(eventId = 'WH-EVT-1') {
  return {
    id: eventId,
    event_type: 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED',
    resource: {
      payout_item_id: 'PPI-1',
      transaction_id: 'TX-1',
      transaction_status: 'SUCCESS',
      payout_batch_id: paypalBatchId,
      payout_item: { sender_item_id: 'PI-SEED-001', receiver: 'rahim.shaikh@example.com' },
    },
  };
}

describe('paypal webhooks', () => {
  test('verification FAILURE -> 400, WEBHOOK_REJECTED, nothing else changes', async () => {
    fake.state.verify = 'FAILURE';
    const res = await post(itemSucceeded());
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'INVALID_SIGNATURE');
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'WEBHOOK_REJECTED' AND status = 'REJECTED'").get());
    assert.equal(item('PI-SEED-001').status, 'PENDING');
    assert.equal(disbursed(), 240000);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM webhook_events').get().n, 0);
  });

  test('verify call carries the five paypal-* headers and webhook_id', async () => {
    await post(itemSucceeded());
    const verify = fake.calls.find((c) => c.path === '/v1/notifications/verify-webhook-signature');
    assert.equal(verify.body.auth_algo, 'SHA256withRSA');
    assert.equal(verify.body.cert_url, PAYPAL_HEADERS['PAYPAL-CERT-URL']);
    assert.equal(verify.body.transmission_id, 'tx-id-1');
    assert.equal(verify.body.transmission_sig, 'sig-value');
    assert.equal(verify.body.transmission_time, '2026-10-30T10:00:00Z');
    assert.equal(verify.body.webhook_id, 'WH-TEST');
    assert.equal(verify.body.webhook_event.id, 'WH-EVT-1');
  });

  test('PAYOUTS-ITEM.SUCCEEDED -> item SUCCESS, disbursed up once, replay is a duplicate', async () => {
    const res = await post(itemSucceeded());
    assert.equal(res.status, 200);
    assert.equal(item('PI-SEED-001').status, 'SUCCESS');
    assert.equal(item('PI-SEED-001').paypal_transaction_id, 'TX-1');
    assert.equal(disbursed(), 260000);
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'WEBHOOK_PAYMENT_PAYOUTS_ITEM_SUCCEEDED' AND status = 'VERIFIED'").get());

    const replay = await post(itemSucceeded());
    assert.equal(replay.status, 200);
    assert.equal(replay.body.duplicate, true);
    assert.equal(disbursed(), 260000);

    // A different event for the same item does not count it twice either.
    assert.equal((await post(itemSucceeded('WH-EVT-2'))).status, 200);
    assert.equal(disbursed(), 260000);
  });

  test('PAYOUTSBATCH.SUCCESS -> batch SUCCESS', async () => {
    const res = await post({
      id: 'WH-EVT-B1',
      event_type: 'PAYMENT.PAYOUTSBATCH.SUCCESS',
      resource: { batch_header: { payout_batch_id: paypalBatchId, batch_status: 'SUCCESS' } },
    });
    assert.equal(res.status, 200);
    assert.equal(ctx.db.prepare("SELECT status FROM payout_batches WHERE id = 'PB-SEED-001'").get().status, 'SUCCESS');
  });

  test('PAYMENT.CAPTURE.COMPLETED for a PENDING donation -> COMPLETED, raised up once', async () => {
    const donor = await loginAs(ctx.app, 'mehta.r@techcorp.in');
    const created = await request(ctx.app).post('/api/donations/orders').set(bearer(donor)).send({ campaignId: 'cmp-01', amount: 25 });
    assert.equal(created.status, 201);
    const event = (id) => ({
      id,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAP-W1',
        status: 'COMPLETED',
        custom_id: created.body.donationId,
        amount: { currency_code: 'USD', value: '25.00' },
        supplementary_data: { related_ids: { order_id: created.body.orderId } },
      },
    });
    assert.equal((await post(event('WH-EVT-C1'))).status, 200);
    const row = ctx.db.prepare('SELECT * FROM donations WHERE id = ?').get(created.body.donationId);
    assert.equal(row.status, 'COMPLETED');
    assert.equal(row.paypal_capture_id, 'CAP-W1');
    assert.equal(raised(), 368000 + 2500);

    assert.equal((await post(event('WH-EVT-C2'))).status, 200);
    assert.equal(raised(), 368000 + 2500);
  });

  test('capture followed by PAYMENT.CAPTURE.COMPLETED for the same donation -> raised up once', async () => {
    const donor = await loginAs(ctx.app, 'mehta.r@techcorp.in');
    const created = await request(ctx.app).post('/api/donations/orders').set(bearer(donor)).send({ campaignId: 'cmp-01', amount: 25 });
    const captured = await request(ctx.app).post(`/api/donations/orders/${created.body.orderId}/capture`).set(bearer(donor)).send();
    assert.equal(captured.status, 200);
    const captureId = captured.body.donation.paypalCaptureId;
    assert.equal(raised(), 368000 + 2500);

    const res = await post({
      id: 'WH-EVT-C3',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: captureId, status: 'COMPLETED', custom_id: created.body.donationId, amount: { currency_code: 'USD', value: '25.00' } },
    });
    assert.equal(res.status, 200);
    assert.equal(raised(), 368000 + 2500);
    assert.equal(ctx.db.prepare('SELECT status FROM donations WHERE id = ?').get(created.body.donationId).status, 'COMPLETED');
  });

  test('events for unknown payout items and batches -> 200, nothing changes', async () => {
    const before = ctx.db.prepare('SELECT id, status FROM payout_items ORDER BY id').all();
    const itemRes = await post({
      id: 'WH-EVT-U1',
      event_type: 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED',
      resource: { payout_item_id: 'PPI-UNKNOWN', transaction_status: 'SUCCESS', payout_item: { sender_item_id: 'PI-UNKNOWN' } },
    });
    assert.equal(itemRes.status, 200);
    const batchRes = await post({
      id: 'WH-EVT-U2',
      event_type: 'PAYMENT.PAYOUTSBATCH.SUCCESS',
      resource: { batch_header: { payout_batch_id: 'PPB-UNKNOWN', batch_status: 'SUCCESS' } },
    });
    assert.equal(batchRes.status, 200);
    assert.deepEqual(ctx.db.prepare('SELECT id, status FROM payout_items ORDER BY id').all(), before);
    assert.equal(ctx.db.prepare("SELECT status FROM payout_batches WHERE id = 'PB-SEED-001'").get().status, 'PENDING');
    assert.equal(disbursed(), 240000);
  });

  test('missing paypal-* headers -> 400, no audit row, no PayPal call', async () => {
    const auditsBefore = ctx.db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n;
    const callsBefore = fake.calls.length;
    const { 'PAYPAL-TRANSMISSION-SIG': _omitted, ...partial } = PAYPAL_HEADERS;
    for (const headers of [{}, partial]) {
      const res = await request(ctx.app).post('/api/webhooks/paypal').set(headers).send(itemSucceeded());
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'MISSING_SIGNATURE_HEADERS');
    }
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n, auditsBefore);
    assert.equal(fake.calls.length, callsBefore);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM webhook_events').get().n, 0);
  });

  test('unknown event types are recorded only', async () => {
    const res = await post({ id: 'WH-EVT-X', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'ORDER-9' } });
    assert.equal(res.status, 200);
    assert.equal(ctx.db.prepare("SELECT processed FROM webhook_events WHERE id = 'WH-EVT-X'").get().processed, 1);
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'WEBHOOK_CHECKOUT_ORDER_APPROVED'").get());
  });

  test('no PAYPAL_WEBHOOK_ID configured -> 503 and WEBHOOK_REJECTED', async () => {
    const c = makeTestContext({ configOverrides: { PAYPAL_WEBHOOK_ID: '' }, paypalFetch: fake.fetch });
    const before = fake.calls.length;
    const res = await request(c.app).post('/api/webhooks/paypal').set(PAYPAL_HEADERS).send(itemSucceeded());
    assert.equal(res.status, 503);
    assert.ok(c.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'WEBHOOK_REJECTED'").get());
    assert.equal(fake.calls.length, before);
  });
});
