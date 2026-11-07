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
let admin;
let donationId;
let captureId;

beforeEach(async () => {
  fake = makeFakePayPal();
  ctx = makeTestContext({ paypalFetch: fake.fetch });
  admin = await loginAs(ctx.app, 'alok.v@reliefpay.org');
  const donor = await loginAs(ctx.app, 'mehta.r@techcorp.in');
  const created = await request(ctx.app).post('/api/donations/orders').set(bearer(donor)).send({ campaignId: 'cmp-01', amount: 25 });
  assert.equal(created.status, 201);
  const captured = await request(ctx.app).post(`/api/donations/orders/${created.body.orderId}/capture`).set(bearer(donor)).send();
  assert.equal(captured.status, 200);
  donationId = created.body.donationId;
  captureId = captured.body.donation.paypalCaptureId;
  assert.equal(raised(), 370500);
});

const raised = () => ctx.db.prepare("SELECT raised_cents FROM campaigns WHERE id = 'cmp-01'").get().raised_cents;
const refundCalls = () => fake.calls.filter((c) => /\/v2\/payments\/captures\/[^/]+\/refund$/.test(c.path));
const refund = (body, token = admin, id = donationId) =>
  request(ctx.app).post(`/api/donations/${id}/refund`).set(bearer(token)).send(body);
const post = (event) => request(ctx.app).post('/api/webhooks/paypal').set(PAYPAL_HEADERS).send(event);
const refundEvent = (eventId, { refundId, value, type = 'PAYMENT.CAPTURE.REFUNDED', status = 'COMPLETED', capture = captureId }) => ({
  id: eventId,
  event_type: type,
  resource_type: 'refund',
  resource: {
    id: refundId,
    status,
    amount: { currency_code: 'USD', value },
    seller_payable_breakdown: { total_refunded_amount: { currency_code: 'USD', value } },
    links: [
      { rel: 'self', href: `https://api.sandbox.paypal.com/v2/payments/refunds/${refundId}`, method: 'GET' },
      { rel: 'up', href: `https://api.sandbox.paypal.com/v2/payments/captures/${capture}`, method: 'GET' },
    ],
  },
});

describe('admin refunds', () => {
  test('partial then remaining refund lower raised once each; a third is rejected', async () => {
    const res = await refund({ amount: 10 });
    assert.equal(res.status, 200);
    assert.equal(res.body.refund.status, 'COMPLETED');
    assert.equal(res.body.refund.appliedAmount, 10);
    assert.equal(res.body.donation.refundedAmount, 10);
    assert.equal(res.body.campaign.raisedAmount, 3695);
    assert.equal(raised(), 369500);

    const [call] = refundCalls();
    assert.equal(call.path, `/v2/payments/captures/${captureId}/refund`);
    assert.equal(call.headers.Prefer, 'return=representation');
    assert.equal(call.headers['PayPal-Request-Id'], `ref-${donationId}-0-1000`);
    assert.deepEqual(call.body.amount, { currency_code: 'USD', value: '10.00' });
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'DONATION_REFUNDED' AND status = 'VERIFIED'").get());
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'DONATION_REFUND_REQUESTED'").get());

    fake.state.refundFullValue = '15.00';
    const rest = await refund({});
    assert.equal(rest.status, 200);
    assert.equal(refundCalls()[1].body.amount, undefined);
    assert.equal(refundCalls()[1].headers['PayPal-Request-Id'], `ref-${donationId}-1000-1500`);
    assert.equal(rest.body.donation.refundedAmount, 25);
    assert.equal(raised(), 368000);

    const third = await refund({});
    assert.equal(third.status, 409);
    assert.equal(third.body.error, 'DONATION_NOT_REFUNDABLE');
    assert.equal(refundCalls().length, 2);
  });

  test('validation errors make no PayPal call', async () => {
    const over = await refund({ amount: 30 });
    assert.equal(over.status, 400);
    assert.equal(over.body.error, 'REFUND_EXCEEDS_REMAINING');
    for (const amount of [0, 10.001, '5', -1]) {
      const res = await refund({ amount });
      assert.equal(res.status, 400, `amount ${amount}`);
      assert.equal(res.body.error, 'INVALID_AMOUNT');
    }
    const note = await refund({ amount: 5, note: 'x'.repeat(256) });
    assert.equal(note.status, 400);
    assert.equal(note.body.error, 'INVALID_NOTE');
    assert.equal(refundCalls().length, 0);
    assert.equal(raised(), 370500);
  });

  test('DONOR and AUDITOR -> 403; unknown -> 404; PENDING donation -> 409', async () => {
    const donor = await loginAs(ctx.app, 'mehta.r@techcorp.in');
    const auditor = await loginAs(ctx.app, 'elena@auditcore.org');
    assert.equal((await refund({ amount: 5 }, donor)).status, 403);
    assert.equal((await refund({ amount: 5 }, auditor)).status, 403);
    assert.equal((await refund({ amount: 5 }, admin, 'DON-nope')).status, 404);

    const created = await request(ctx.app).post('/api/donations/orders').set(bearer(donor)).send({ campaignId: 'cmp-01', amount: 25 });
    const pending = await refund({ amount: 5 }, admin, created.body.donationId);
    assert.equal(pending.status, 409);
    assert.equal(pending.body.error, 'DONATION_NOT_REFUNDABLE');
    assert.equal(refundCalls().length, 0);
  });

  test('PayPal error -> 502, DONATION_REFUND_FAILED, raised unchanged', async () => {
    fake.state.refundError = 422;
    const res = await refund({ amount: 10 });
    assert.equal(res.status, 502);
    assert.equal(res.body.error, 'PAYPAL_ERROR');
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'DONATION_REFUND_FAILED' AND status = 'FAILED'").get());
    assert.equal(raised(), 370500);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM refunds').get().n, 0);
  });

  test('PENDING refund is applied once when the webhook reports it COMPLETED', async () => {
    fake.state.refundStatus = 'PENDING';
    const res = await refund({ amount: 10 });
    assert.equal(res.status, 200);
    assert.equal(res.body.refund.status, 'PENDING');
    assert.equal(raised(), 370500);
    const refundId = res.body.refund.id;
    assert.equal(ctx.db.prepare('SELECT counted FROM refunds WHERE id = ?').get(refundId).counted, 0);

    assert.equal((await post(refundEvent('WH-R-P1', { refundId, value: '10.00' }))).status, 200);
    assert.equal(raised(), 369500);
    assert.equal(ctx.db.prepare('SELECT counted FROM refunds WHERE id = ?').get(refundId).counted, 1);

    assert.equal((await post(refundEvent('WH-R-P2', { refundId, value: '10.00' }))).status, 200);
    assert.equal(raised(), 369500);
  });
});

describe('refund webhooks', () => {
  test('webhook for an admin refund already applied does not lower raised again', async () => {
    const res = await refund({ amount: 10 });
    assert.equal(raised(), 369500);
    const hook = await post(refundEvent('WH-R-A1', { refundId: res.body.refund.id, value: '10.00' }));
    assert.equal(hook.status, 200);
    assert.equal(raised(), 369500);
  });

  test('REFUNDED with a new refund id lowers raised once; replays and re-deliveries do not', async () => {
    const res = await post(refundEvent('WH-R-1', { refundId: 'REF-W1', value: '5.00' }));
    assert.equal(res.status, 200);
    assert.equal(raised(), 370000);
    const row = ctx.db.prepare("SELECT * FROM refunds WHERE id = 'REF-W1'").get();
    assert.equal(row.source, 'WEBHOOK');
    assert.equal(row.event_type, 'PAYMENT.CAPTURE.REFUNDED');
    assert.equal(row.applied_cents, 500);
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'DONATION_REFUND_APPLIED' AND status = 'VERIFIED'").get());
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'WEBHOOK_PAYMENT_CAPTURE_REFUNDED'").get());

    const replay = await post(refundEvent('WH-R-1', { refundId: 'REF-W1', value: '5.00' }));
    assert.equal(replay.body.duplicate, true);
    assert.equal(raised(), 370000);

    assert.equal((await post(refundEvent('WH-R-2', { refundId: 'REF-W1', value: '5.00' }))).status, 200);
    assert.equal(raised(), 370000);
  });

  test('REVERSED lowers raised, capped at the donation amount', async () => {
    const res = await post(refundEvent('WH-V-1', { refundId: 'REV-1', value: '25.00', type: 'PAYMENT.CAPTURE.REVERSED' }));
    assert.equal(res.status, 200);
    assert.equal(raised(), 368000);
    assert.equal(ctx.db.prepare('SELECT refunded_cents FROM donations WHERE id = ?').get(donationId).refunded_cents, 2500);

    assert.equal((await post(refundEvent('WH-V-2', { refundId: 'REV-2', value: '25.00', type: 'PAYMENT.CAPTURE.REVERSED' }))).status, 200);
    assert.equal(raised(), 368000);
    assert.equal(ctx.db.prepare("SELECT applied_cents FROM refunds WHERE id = 'REV-2'").get().applied_cents, 0);
  });

  test('refund for an unknown capture -> 200, no rows, raised unchanged', async () => {
    const res = await post(refundEvent('WH-R-U', { refundId: 'REF-U', value: '5.00', capture: 'CAP-UNKNOWN' }));
    assert.equal(res.status, 200);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM refunds').get().n, 0);
    assert.equal(raised(), 370500);
  });
});
