import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { loginAs, makeTestContext } from './helpers.js';
import { makeFakePayPal } from './paypal-fake.js';

// Cross-feature checks: refunds (FEAT-001) on split donation units (FEAT-002)
// as seen by the analytics endpoint (FEAT-003).
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
let split;
let before;

const raised = (id) => ctx.db.prepare('SELECT raised_cents FROM campaigns WHERE id = ?').get(id).raised_cents;
const unitFor = (campaignId) => split.donations.find((d) => d.campaignId === campaignId);

beforeEach(async () => {
  fake = makeFakePayPal();
  ctx = makeTestContext({ paypalFetch: fake.fetch });
  admin = await loginAs(ctx.app, 'alok.v@reliefpay.org');
  const donor = await loginAs(ctx.app, 'mehta.r@techcorp.in');
  before = { 'cmp-01': raised('cmp-01'), 'cmp-02': raised('cmp-02') };
  const created = await request(ctx.app)
    .post('/api/donations/split-orders')
    .set(bearer(donor))
    .send({ allocations: [{ campaignId: 'cmp-01', amount: 6 }, { campaignId: 'cmp-02', amount: 4 }] });
  assert.equal(created.status, 201);
  const captured = await request(ctx.app)
    .post(`/api/donations/split-orders/${created.body.orderId}/capture`)
    .set(bearer(donor))
    .send();
  assert.equal(captured.status, 200);
  split = captured.body.split;
  assert.equal(split.status, 'COMPLETED');
});

describe('refunds on split donation units', () => {
  test('admin partial refund of one unit lowers only that campaign, and analytics shows it', async () => {
    const unit = unitFor('cmp-01');
    const res = await request(ctx.app).post(`/api/donations/${unit.id}/refund`).set(bearer(admin)).send({ amount: 2 });
    assert.equal(res.status, 200);
    assert.equal(res.body.donation.refundedAmount, 2);
    assert.equal(res.body.donation.splitOrderId, split.id);
    const call = fake.calls.find((c) => c.path.endsWith('/refund'));
    assert.equal(call.path, `/v2/payments/captures/${unit.paypalCaptureId}/refund`);
    assert.equal(raised('cmp-01'), before['cmp-01'] + 600 - 200);
    assert.equal(raised('cmp-02'), before['cmp-02'] + 400);

    const analytics = await request(ctx.app).get('/api/analytics').set(bearer(admin));
    assert.equal(analytics.status, 200);
    const row = analytics.body.donations.find((d) => d.id === unit.id);
    assert.equal(row.kind, 'SPLIT');
    assert.equal(row.refundedAmount, 2);
    assert.equal(row.netAmount, 4);
    assert.ok(analytics.body.refunds.some((r) => r.donationId === unit.id && r.amount === 2));
  });

  test('a refund webhook for the other unit is applied once and capped at that unit', async () => {
    const unit = unitFor('cmp-02');
    const event = (id, refundId) => ({
      id,
      event_type: 'PAYMENT.CAPTURE.REFUNDED',
      resource: {
        id: refundId,
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: '10.00' },
        links: [{ rel: 'up', href: `https://api.sandbox.paypal.com/v2/payments/captures/${unit.paypalCaptureId}`, method: 'GET' }],
      },
    });
    const first = await request(ctx.app).post('/api/webhooks/paypal').set(PAYPAL_HEADERS).send(event('WH-SEAM-1', 'REF-SEAM-1'));
    assert.equal(first.status, 200);
    assert.equal(raised('cmp-02'), before['cmp-02']);
    assert.equal(raised('cmp-01'), before['cmp-01'] + 600);
    const again = await request(ctx.app).post('/api/webhooks/paypal').set(PAYPAL_HEADERS).send(event('WH-SEAM-2', 'REF-SEAM-1'));
    assert.equal(again.status, 200);
    assert.equal(raised('cmp-02'), before['cmp-02']);
    const refunded = ctx.db.prepare('SELECT refunded_cents FROM donations WHERE id = ?').get(unit.id).refunded_cents;
    assert.equal(refunded, 400);

    // A fully refunded unit cannot be refunded again (no PayPal call).
    const blocked = await request(ctx.app).post(`/api/donations/${unit.id}/refund`).set(bearer(admin)).send({});
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error, 'DONATION_NOT_REFUNDABLE');
    assert.equal(fake.calls.filter((c) => c.path.endsWith('/refund')).length, 0);
  });
});
