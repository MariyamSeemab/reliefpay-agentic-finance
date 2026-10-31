import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { loginAs, makeTestContext } from './helpers.js';
import { makeFakePayPal } from './paypal-fake.js';

const DONOR = 'mehta.r@techcorp.in';
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

let ctx;
let fake;
let token;
beforeEach(async () => {
  fake = makeFakePayPal();
  ctx = makeTestContext({ paypalFetch: fake.fetch });
  token = await loginAs(ctx.app, DONOR);
});

function createOrder(body) {
  return request(ctx.app).post('/api/donations/orders').set(bearer(token)).send(body);
}

function auditActions() {
  return ctx.db.prepare('SELECT action FROM audit_logs').all().map((r) => r.action);
}

async function raisedFor(id) {
  const res = await request(ctx.app).get(`/api/campaigns/${id}`);
  return res.body.campaign.raisedAmount;
}

describe('donations', () => {
  test('create order -> 201 with orderId and a PENDING donation', async () => {
    const res = await createOrder({ campaignId: 'cmp-01', amount: 25 });
    assert.equal(res.status, 201);
    assert.match(res.body.orderId, /^ORDER-/);
    assert.match(res.body.donationId, /^DON-/);

    const row = ctx.db.prepare('SELECT * FROM donations WHERE id = ?').get(res.body.donationId);
    assert.equal(row.status, 'PENDING');
    assert.equal(row.paypal_order_id, res.body.orderId);
    assert.equal(row.amount_cents, 2500);
    assert.equal(row.user_id, 'usr-4');

    const orderCall = fake.calls.find((c) => c.path === '/v2/checkout/orders');
    assert.equal(orderCall.headers['PayPal-Request-Id'], res.body.donationId);
    assert.equal(orderCall.headers.Authorization, 'Bearer A21-test');
    assert.equal(orderCall.body.intent, 'CAPTURE');
    const unit = orderCall.body.purchase_units[0];
    assert.deepEqual(unit.amount, { currency_code: 'USD', value: '25.00' });
    assert.equal(unit.custom_id, res.body.donationId);
    assert.equal(unit.reference_id, 'cmp-01');
    assert.ok(unit.description.length <= 127);

    const tokenCall = fake.calls.find((c) => c.path === '/v1/oauth2/token');
    assert.equal(tokenCall.body, 'grant_type=client_credentials');
    assert.equal(tokenCall.headers.Authorization, 'Basic ' + Buffer.from('test-client:test-secret').toString('base64'));
  });

  test('capture -> COMPLETED, raised 3680 -> 3705 once, audited', async () => {
    assert.equal(await raisedFor('cmp-01'), 3680);
    const created = await createOrder({ campaignId: 'cmp-01', amount: 25 });
    const res = await request(ctx.app).post(`/api/donations/orders/${created.body.orderId}/capture`).set(bearer(token)).send();
    assert.equal(res.status, 200);
    assert.equal(res.body.donation.status, 'COMPLETED');
    assert.equal(res.body.donation.amount, 25);
    assert.match(res.body.donation.paypalCaptureId, /^CAP-/);
    assert.equal(res.body.campaign.raisedAmount, 3705);

    const captureCall = fake.calls.find((c) => c.path.endsWith('/capture'));
    assert.equal(captureCall.headers['PayPal-Request-Id'], 'cap-' + created.body.donationId);
    assert.deepEqual(captureCall.body, {});

    const actions = auditActions();
    assert.ok(actions.includes('DONATION_ORDER_CREATED'));
    assert.ok(actions.includes('DONATION_CAPTURED'));

    const again = await request(ctx.app).post(`/api/donations/orders/${created.body.orderId}/capture`).set(bearer(token)).send();
    assert.equal(again.status, 200);
    assert.equal(again.body.campaign.raisedAmount, 3705);
    assert.equal(await raisedFor('cmp-01'), 3705);
    assert.equal(fake.calls.filter((c) => c.path.endsWith('/capture')).length, 1);
    // OAuth token is cached across calls.
    assert.equal(fake.calls.filter((c) => c.path === '/v1/oauth2/token').length, 1);
  });

  test("PayPal's captured amount wins over the requested amount", async () => {
    fake.state.captureValue = '30.00';
    const created = await createOrder({ campaignId: 'cmp-01', amount: 25 });
    const res = await request(ctx.app).post(`/api/donations/orders/${created.body.orderId}/capture`).set(bearer(token)).send();
    assert.equal(res.status, 200);
    assert.equal(res.body.donation.amount, 30);
    assert.equal(res.body.campaign.raisedAmount, 3710);
  });

  for (const amount of [0, -5, 10.001, 20000, '25']) {
    test(`invalid amount ${JSON.stringify(amount)} -> 400`, async () => {
      const res = await createOrder({ campaignId: 'cmp-01', amount });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'INVALID_AMOUNT');
      assert.equal(fake.calls.length, 0);
    });
  }

  test('unknown campaign -> 404, completed campaign -> 409', async () => {
    assert.equal((await createOrder({ campaignId: 'cmp-99', amount: 25 })).status, 404);
    const res = await createOrder({ campaignId: 'cmp-03', amount: 25 });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'CAMPAIGN_NOT_ACTIVE');
  });

  test('unauthenticated create -> 401', async () => {
    const res = await request(ctx.app).post('/api/donations/orders').send({ campaignId: 'cmp-01', amount: 25 });
    assert.equal(res.status, 401);
  });

  test('missing PayPal credentials -> 503 PAYPAL_NOT_CONFIGURED and no donation row', async () => {
    const c = makeTestContext({ configOverrides: { PAYPAL_CLIENT_SECRET: '' }, paypalFetch: fake.fetch });
    const t = await loginAs(c.app, DONOR);
    const res = await request(c.app).post('/api/donations/orders').set(bearer(t)).send({ campaignId: 'cmp-01', amount: 25 });
    assert.equal(res.status, 503);
    assert.equal(res.body.error, 'PAYPAL_NOT_CONFIGURED');
    assert.equal(c.db.prepare("SELECT COUNT(*) AS n FROM donations WHERE status = 'PENDING'").get().n, 0);
    assert.equal(fake.calls.length, 0);
  });

  test('GET /api/donations: AUDITOR 200 newest first, DONOR 403', async () => {
    await createOrder({ campaignId: 'cmp-01', amount: 25 });
    const auditor = await loginAs(ctx.app, 'elena@auditcore.org');
    const res = await request(ctx.app).get('/api/donations').set(bearer(auditor));
    assert.equal(res.status, 200);
    assert.equal(res.body.donations.length, 4);
    assert.equal(res.body.donations[0].status, 'PENDING');
    assert.equal((await request(ctx.app).get('/api/donations').set(bearer(token))).status, 403);
  });
});
