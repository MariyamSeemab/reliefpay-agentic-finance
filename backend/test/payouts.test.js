import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { loginAs, makeTestContext } from './helpers.js';
import { makeFakePayPal } from './paypal-fake.js';

const ADMIN = 'alok.v@reliefpay.org';
const REVIEWER = 's.jenkins@reliefpay.org';
const CODE = '246810';
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

let ctx;
let fake;
let admin;

async function setup(configOverrides = {}) {
  fake = makeFakePayPal();
  ctx = makeTestContext({ configOverrides, paypalFetch: fake.fetch });
  admin = await loginAs(ctx.app, ADMIN);
}

beforeEach(() => setup());

const payoutPosts = () => fake.calls.filter((c) => c.method === 'POST' && c.path === '/v1/payments/payouts');
const release = (id, authCode, token = admin) =>
  request(ctx.app).post(`/api/payouts/${id}/release`).set(bearer(token)).send({ authCode });
const batchRow = (id) => ctx.db.prepare('SELECT * FROM payout_batches WHERE id = ?').get(id);
const campaign = async (id) => (await request(ctx.app).get(`/api/campaigns/${id}`)).body.campaign;

describe('payouts', () => {
  test('ADMIN drafts a batch from an APPROVED application -> 201 DRAFT', async () => {
    const res = await request(ctx.app)
      .post('/api/payouts')
      .set(bearer(admin))
      .send({ campaignId: 'cmp-01', applicationIds: ['RPA-2026-0024'], note: 'Round 2' });
    assert.equal(res.status, 201);
    const b = res.body.batch;
    assert.equal(b.status, 'DRAFT');
    assert.match(b.id, /^PB-/);
    assert.equal(b.totalAmount, 160);
    assert.equal(b.beneficiaryCount, 1);
    assert.equal(b.draftedByAi, false);
    assert.equal(b.items[0].receiverEmail, 'an***@example.com');
    assert.match(b.items[0].id, /^PI-/);
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'PAYOUT_DRAFTED'").get());

    const list = await request(ctx.app).get('/api/payouts').set(bearer(admin));
    assert.equal(list.status, 200);
    assert.equal(list.body.batches[0].id, b.id);
    assert.equal(list.body.batches.length, 2);
  });

  test('drafting an UNDER_REVIEW application -> 409 with offending ids', async () => {
    const res = await request(ctx.app)
      .post('/api/payouts')
      .set(bearer(admin))
      .send({ campaignId: 'cmp-01', applicationIds: ['RPA-2026-0012'] });
    assert.equal(res.status, 409);
    assert.deepEqual(res.body.offendingIds, ['RPA-2026-0012']);
  });

  test('drafting an application already in the seeded batch -> 409', async () => {
    const res = await request(ctx.app)
      .post('/api/payouts')
      .set(bearer(admin))
      .send({ campaignId: 'cmp-01', applicationIds: ['RPA-2026-0015'] });
    assert.equal(res.status, 409);
    assert.deepEqual(res.body.offendingIds, ['RPA-2026-0015']);
  });

  test('REVIEWER release -> 403', async () => {
    const reviewer = await loginAs(ctx.app, REVIEWER);
    const res = await release('PB-SEED-001', CODE, reviewer);
    assert.equal(res.status, 403);
    assert.equal(payoutPosts().length, 0);
  });

  test('wrong code -> 403, still DRAFT, attempt counted, audited, no payout call', async () => {
    const res = await release('PB-SEED-001', '000000');
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'INVALID_AUTH_CODE');
    const row = batchRow('PB-SEED-001');
    assert.equal(row.status, 'DRAFT');
    assert.equal(row.failed_auth_attempts, 1);
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'PAYOUT_RELEASE_REJECTED' AND status = 'REJECTED'").get());
    assert.equal(payoutPosts().length, 0);
  });

  test('no PAYOUT_AUTH_CODE configured -> 503', async () => {
    await setup({ PAYOUT_AUTH_CODE: '' });
    const res = await release('PB-SEED-001', CODE);
    assert.equal(res.status, 503);
    assert.equal(res.body.error, 'PAYOUT_AUTH_NOT_CONFIGURED');
    assert.equal(payoutPosts().length, 0);
  });

  test('correct code -> 200 PENDING with one PayPal payout call; second release -> 409', async () => {
    const res = await release('PB-SEED-001', CODE);
    assert.equal(res.status, 200);
    assert.equal(res.body.batch.status, 'PENDING');
    assert.match(res.body.batch.paypalBatchId, /^PPB-/);
    assert.equal(batchRow('PB-SEED-001').paypal_batch_id, res.body.batch.paypalBatchId);
    assert.equal(batchRow('PB-SEED-001').released_by_user_id, 'usr-1');

    const posts = payoutPosts();
    assert.equal(posts.length, 1);
    assert.equal(posts[0].body.sender_batch_header.sender_batch_id, 'PB-SEED-001');
    assert.equal(posts[0].body.sender_batch_header.recipient_type, 'EMAIL');
    assert.deepEqual(
      posts[0].body.items.map((i) => [i.receiver, i.sender_item_id, i.amount.value, i.amount.currency]),
      [
        ['rahim.shaikh@example.com', 'PI-SEED-001', '200.00', 'USD'],
        ['rajesh.patel@example.com', 'PI-SEED-002', '220.00', 'USD'],
      ],
    );
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'PAYOUT_RELEASED' AND status = 'VERIFIED'").get());
    // Released items reserve their funds.
    assert.equal((await campaign('cmp-01')).availableAmount, 1280 - 420);

    const again = await release('PB-SEED-001', CODE);
    assert.equal(again.status, 409);
    assert.equal(payoutPosts().length, 1);
  });

  test('PayPal 5xx on release -> RELEASE_FAILED, items DRAFT, audited; apps stay held; retry reuses sender_batch_id', async () => {
    fake.state.payoutError = 500;
    const failed = await release('PB-SEED-001', CODE);
    assert.equal(failed.status, 502);
    assert.equal(failed.body.error, 'PAYPAL_PAYOUT_FAILED');
    assert.equal(batchRow('PB-SEED-001').status, 'RELEASE_FAILED');
    assert.equal(batchRow('PB-SEED-001').paypal_batch_id, null);
    const statuses = ctx.db.prepare("SELECT status FROM payout_items WHERE batch_id = 'PB-SEED-001'").all().map((r) => r.status);
    assert.deepEqual(statuses, ['DRAFT', 'DRAFT']);
    assert.ok(ctx.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'PAYOUT_RELEASE_FAILED' AND status = 'FAILED'").get());

    // The failed batch still holds its applications, so they cannot be paid twice.
    const redraft = await request(ctx.app)
      .post('/api/payouts')
      .set(bearer(admin))
      .send({ campaignId: 'cmp-01', applicationIds: ['RPA-2026-0015'] });
    assert.equal(redraft.status, 409);
    assert.deepEqual(redraft.body.offendingIds, ['RPA-2026-0015']);
    assert.equal(redraft.body.reasons['RPA-2026-0015'], 'IN_BATCH_PB-SEED-001');

    delete fake.state.payoutError;
    const retry = await release('PB-SEED-001', CODE);
    assert.equal(retry.status, 200);
    assert.equal(retry.body.batch.status, 'PENDING');
    const posts = payoutPosts();
    assert.equal(posts.length, 2);
    assert.deepEqual(
      posts.map((p) => p.body.sender_batch_header.sender_batch_id),
      ['PB-SEED-001', 'PB-SEED-001'],
    );
  });

  test('changing the approved amount of an application held by a batch -> 409', async () => {
    const reviewer = await loginAs(ctx.app, REVIEWER);
    const patch = (approvedAmount) =>
      request(ctx.app)
        .patch('/api/applications/RPA-2026-0015/status')
        .set(bearer(reviewer))
        .send({ status: 'APPROVED', approvedAmount });
    const before = ctx.db.prepare("SELECT approved_cents FROM applications WHERE id = 'RPA-2026-0015'").get().approved_cents;

    const res = await patch(999);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'APPLICATION_IN_BATCH');
    assert.equal(res.body.batchId, 'PB-SEED-001');
    assert.equal(ctx.db.prepare("SELECT approved_cents FROM applications WHERE id = 'RPA-2026-0015'").get().approved_cents, before);

    // Re-approving with the drafted amount is still allowed.
    assert.equal((await patch(200)).status, 200);
  });

  test('PAYOUT_RECEIVER_EMAIL overrides every receiver', async () => {
    await setup({ PAYOUT_RECEIVER_EMAIL: 'sandbox-personal@example.com' });
    const res = await release('PB-SEED-001', CODE);
    assert.equal(res.status, 200);
    assert.deepEqual(
      payoutPosts()[0].body.items.map((i) => i.receiver),
      ['sandbox-personal@example.com', 'sandbox-personal@example.com'],
    );
  });

  test('5 wrong codes -> 423 on the 6th try, even with the right code', async () => {
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await release('PB-SEED-001', 'bad')).status, 403);
    }
    const res = await release('PB-SEED-001', CODE);
    assert.equal(res.status, 423);
    assert.equal(res.body.error, 'BATCH_LOCKED');
    assert.equal(payoutPosts().length, 0);
  });

  test('sync applies batch SUCCESS and item SUCCESS; disbursed increases once', async () => {
    const released = await release('PB-SEED-001', CODE);
    const ppb = released.body.batch.paypalBatchId;
    assert.equal((await campaign('cmp-01')).disbursedAmount, 2400);
    fake.state.payoutBatch = {
      batch_header: { payout_batch_id: ppb, batch_status: 'SUCCESS' },
      items: [
        {
          payout_item_id: 'PPI-1',
          transaction_id: 'TX-1',
          transaction_status: 'SUCCESS',
          payout_batch_id: ppb,
          payout_item: { sender_item_id: 'PI-SEED-001', receiver: 'rahim.shaikh@example.com' },
        },
      ],
    };
    const sync = () => request(ctx.app).post('/api/payouts/PB-SEED-001/sync').set(bearer(admin)).send();
    const res = await sync();
    assert.equal(res.status, 200);
    assert.equal(res.body.batch.status, 'SUCCESS');
    const item = res.body.batch.items.find((i) => i.id === 'PI-SEED-001');
    assert.equal(item.status, 'SUCCESS');
    assert.equal(item.transactionId, 'TX-1');
    assert.equal((await campaign('cmp-01')).disbursedAmount, 2600);

    assert.equal((await sync()).status, 200);
    assert.equal((await campaign('cmp-01')).disbursedAmount, 2600);
    assert.ok(fake.calls.some((c) => c.method === 'GET' && c.path === `/v1/payments/payouts/${ppb}`));
  });
});
