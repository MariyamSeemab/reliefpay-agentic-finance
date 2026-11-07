import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import { loginAs, makeTestContext } from './helpers.js';
import { makeFakePayPal } from './paypal-fake.js';

const ADMIN = 'alok.v@reliefpay.org';
const AUDITOR = 'elena@auditcore.org';
const DONOR = 'mehta.r@techcorp.in';
const REVIEWER = 's.jenkins@reliefpay.org';
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

function setup(configOverrides = {}) {
  const fake = makeFakePayPal();
  const ctx = makeTestContext({ configOverrides, paypalFetch: fake.fetch });
  return { ctx, fake };
}

const getAnalytics = (ctx, token) => request(ctx.app).get('/api/analytics').set(bearer(token));

describe('GET /api/analytics', () => {
  test('ADMIN and AUDITOR get every table with seeded data', async () => {
    const { ctx } = setup();
    for (const email of [ADMIN, AUDITOR]) {
      const res = await getAnalytics(ctx, await loginAs(ctx.app, email));
      assert.equal(res.status, 200);
      assert.deepEqual(Object.keys(res.body).sort(), [
        'asOf', 'campaigns', 'currency', 'donations', 'donors', 'payoutBatches', 'payoutItems', 'refunds', 'studio',
      ]);
      assert.equal(res.body.currency, 'USD');
      assert.equal(res.body.campaigns.length, 3);
      const cmp1 = res.body.campaigns.find((c) => c.id === 'cmp-01');
      assert.equal(cmp1.raised, 3680);
      assert.equal(cmp1.target, 5000);
      assert.equal(cmp1.fundedPct, 3680 / 5000);
      for (const id of ['DON-901', 'DON-902', 'DON-903']) {
        assert.ok(res.body.donations.some((d) => d.id === id), id);
      }
      const don901 = res.body.donations.find((d) => d.id === 'DON-901');
      assert.equal(don901.kind, 'SINGLE');
      assert.equal(don901.netAmount, 500);
      assert.ok(res.body.donors.some((d) => d.donorName === 'Rohan Mehta' && d.totalDonated >= 500));
      const batch = res.body.payoutBatches.find((b) => b.id === 'PB-SEED-001');
      assert.ok(batch);
      const items = res.body.payoutItems.filter((i) => i.batchId === 'PB-SEED-001');
      assert.equal(items.length, batch.itemCount);
      assert.ok(items.length > 0);
      assert.ok(items.every((i) => typeof i.beneficiaryName === 'string'));
      assert.deepEqual(res.body.refunds, []);
    }
  });

  test('DONOR and REVIEWER -> 403; no token -> 401', async () => {
    const { ctx } = setup();
    for (const email of [DONOR, REVIEWER]) {
      assert.equal((await getAnalytics(ctx, await loginAs(ctx.app, email))).status, 403);
    }
    assert.equal((await request(ctx.app).get('/api/analytics')).status, 401);
  });

  test('payload has no emails, receiver fields, password hashes or user ids', async () => {
    const { ctx } = setup();
    const res = await getAnalytics(ctx, await loginAs(ctx.app, ADMIN));
    const text = JSON.stringify(res.body);
    for (const needle of ['@example.com', 'receiver', 'password', 'usr-']) {
      assert.ok(!text.includes(needle), needle);
    }
  });

  test('studio settings: licence key, model allow-list and AI switch', async () => {
    let { ctx } = setup();
    let res = await getAnalytics(ctx, await loginAs(ctx.app, ADMIN));
    assert.equal(res.body.studio.licenseKey, null);
    assert.deepEqual(res.body.studio.aiModels, ['openai/gpt-oss-120b']);
    // Off by default (Groq on_demand TPM limit, see config.js).
    assert.equal(res.body.studio.aiEnabled, false);

    ({ ctx } = setup({ AG_STUDIO_LICENSE: 'test-licence' }));
    res = await getAnalytics(ctx, await loginAs(ctx.app, ADMIN));
    assert.equal(res.body.studio.licenseKey, 'test-licence');

    ({ ctx } = setup({ AG_STUDIO_AI: 'on' }));
    res = await getAnalytics(ctx, await loginAs(ctx.app, ADMIN));
    assert.equal(res.body.studio.aiEnabled, true);

    ({ ctx } = setup({ AG_STUDIO_AI: 'off' }));
    res = await getAnalytics(ctx, await loginAs(ctx.app, ADMIN));
    assert.equal(res.body.studio.aiEnabled, false);

    ({ ctx } = setup({ AG_STUDIO_AI: 'on', GROQ_API_KEY: '' }));
    res = await getAnalytics(ctx, await loginAs(ctx.app, ADMIN));
    assert.equal(res.body.studio.aiEnabled, false);
  });

  test('an admin refund shows in refundedAmount, netAmount, refunds and campaign raised', async () => {
    const { ctx } = setup();
    const admin = await loginAs(ctx.app, ADMIN);
    const donor = await loginAs(ctx.app, DONOR);
    const created = await request(ctx.app).post('/api/donations/orders').set(bearer(donor)).send({ campaignId: 'cmp-01', amount: 25 });
    assert.equal(created.status, 201);
    const captured = await request(ctx.app).post(`/api/donations/orders/${created.body.orderId}/capture`).set(bearer(donor)).send();
    assert.equal(captured.status, 200);
    const refunded = await request(ctx.app).post(`/api/donations/${created.body.donationId}/refund`).set(bearer(admin)).send({ amount: 10 });
    assert.equal(refunded.status, 200);

    const res = await getAnalytics(ctx, admin);
    const donation = res.body.donations.find((d) => d.id === created.body.donationId);
    assert.equal(donation.amount, 25);
    assert.equal(donation.refundedAmount, 10);
    assert.equal(donation.netAmount, 15);
    assert.equal(res.body.campaigns.find((c) => c.id === 'cmp-01').raised, 3695);
    assert.equal(res.body.refunds.length, 1);
    assert.equal(res.body.refunds[0].donationId, created.body.donationId);
    assert.equal(res.body.refunds[0].campaignId, 'cmp-01');
    assert.equal(res.body.refunds[0].amount, 10);
    assert.equal(res.body.refunds[0].source, 'ADMIN');
  });

  test('a split donation shows kind SPLIT with its split order id', async () => {
    const { ctx } = setup();
    const donor = await loginAs(ctx.app, DONOR);
    const created = await request(ctx.app)
      .post('/api/donations/split-orders')
      .set(bearer(donor))
      .send({ allocations: [{ campaignId: 'cmp-01', amount: 6 }, { campaignId: 'cmp-02', amount: 4 }] });
    assert.equal(created.status, 201);
    const captured = await request(ctx.app).post(`/api/donations/split-orders/${created.body.orderId}/capture`).set(bearer(donor)).send();
    assert.equal(captured.status, 200);

    const res = await getAnalytics(ctx, await loginAs(ctx.app, ADMIN));
    const rows = res.body.donations.filter((d) => created.body.donationIds.includes(d.id));
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.kind, 'SPLIT');
      assert.equal(row.splitOrderId, created.body.splitId);
      assert.equal(row.status, 'COMPLETED');
    }
    assert.equal(res.body.campaigns.find((c) => c.id === 'cmp-02').raised, 9504);
  });
});
