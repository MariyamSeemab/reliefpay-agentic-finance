import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { makeFakeGroq } from './groq-fake.js';
import { loginAs, makeTestContext } from './helpers.js';
import { makeFakePayPal } from './paypal-fake.js';

const DONOR = 'mehta.r@techcorp.in';
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const PAYPAL_HEADERS = {
  'PAYPAL-AUTH-ALGO': 'SHA256withRSA',
  'PAYPAL-CERT-URL': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test',
  'PAYPAL-TRANSMISSION-ID': 'tx-id-1',
  'PAYPAL-TRANSMISSION-SIG': 'sig-value',
  'PAYPAL-TRANSMISSION-TIME': '2026-10-30T10:00:00Z',
};
const SPLIT = { allocations: [{ campaignId: 'cmp-01', amount: 6 }, { campaignId: 'cmp-02', amount: 4 }] };

let ctx;
let fake;
let token;
beforeEach(async () => {
  fake = makeFakePayPal();
  ctx = makeTestContext({ paypalFetch: fake.fetch });
  token = await loginAs(ctx.app, DONOR);
});

const raised = (id) => ctx.db.prepare('SELECT raised_cents FROM campaigns WHERE id = ?').get(id).raised_cents;
const donationCount = () => ctx.db.prepare('SELECT COUNT(*) AS n FROM donations').get().n;
const auditActions = () => ctx.db.prepare('SELECT action FROM audit_logs').all().map((r) => r.action);
const captureCalls = () => fake.calls.filter((c) => c.path.endsWith('/capture'));
const createSplit = (body) => request(ctx.app).post('/api/donations/split-orders').set(bearer(token)).send(body);
const captureSplit = (orderId) =>
  request(ctx.app).post(`/api/donations/split-orders/${orderId}/capture`).set(bearer(token)).send();
const postWebhook = (event) => request(ctx.app).post('/api/webhooks/paypal').set(PAYPAL_HEADERS).send(event);

function captureCompleted(eventId, { captureId, donationId, value }) {
  return {
    id: eventId,
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: { id: captureId, status: 'COMPLETED', custom_id: donationId, amount: { currency_code: 'USD', value } },
  };
}

describe('split donations: create', () => {
  test('create -> 201, one PayPal order with one purchase unit per campaign', async () => {
    const res = await createSplit(SPLIT);
    assert.equal(res.status, 201);
    assert.match(res.body.orderId, /^ORDER-/);
    assert.match(res.body.splitId, /^SPL-/);
    assert.equal(res.body.donationIds.length, 2);

    const orderCall = fake.calls.find((c) => c.path === '/v2/checkout/orders');
    assert.equal(orderCall.headers['PayPal-Request-Id'], res.body.splitId);
    assert.equal(orderCall.body.intent, 'CAPTURE');
    const units = orderCall.body.purchase_units;
    assert.equal(units.length, 2);
    assert.deepEqual(units.map((u) => u.reference_id), ['cmp-01', 'cmp-02']);
    assert.deepEqual(units.map((u) => u.custom_id), res.body.donationIds);
    assert.deepEqual(units.map((u) => u.amount), [
      { currency_code: 'USD', value: '6.00' },
      { currency_code: 'USD', value: '4.00' },
    ]);
    assert.ok(units.every((u) => u.description.length <= 127));

    for (const id of res.body.donationIds) {
      const row = ctx.db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
      assert.equal(row.status, 'PENDING');
      assert.equal(row.split_order_id, res.body.splitId);
      assert.equal(row.paypal_order_id, null);
      assert.equal(row.counted, 0);
    }
    const split = ctx.db.prepare('SELECT * FROM split_orders WHERE id = ?').get(res.body.splitId);
    assert.equal(split.status, 'PENDING');
    assert.equal(split.total_cents, 1000);
    assert.equal(split.paypal_order_id, res.body.orderId);
    assert.equal(split.ai_suggested, 0);
    assert.ok(auditActions().includes('DONATION_SPLIT_ORDER_CREATED'));
  });

  const eleven = Array.from({ length: 11 }, (_, i) => ({ campaignId: `cmp-${String(i + 1).padStart(2, '0')}`, amount: 1 }));
  const invalid = [
    ['one allocation', { allocations: [{ campaignId: 'cmp-01', amount: 5 }] }, 400, 'INVALID_SPLIT'],
    ['11 allocations', { allocations: eleven }, 400, 'INVALID_SPLIT'],
    ['duplicate campaign', { allocations: [{ campaignId: 'cmp-01', amount: 5 }, { campaignId: 'cmp-01', amount: 5 }] }, 400, 'INVALID_SPLIT'],
    ['completed campaign', { allocations: [{ campaignId: 'cmp-01', amount: 5 }, { campaignId: 'cmp-03', amount: 5 }] }, 409, 'CAMPAIGN_NOT_ACTIVE'],
    ['unknown campaign', { allocations: [{ campaignId: 'cmp-01', amount: 5 }, { campaignId: 'cmp-99', amount: 5 }] }, 404, 'NOT_FOUND'],
    ['amount 0.5', { allocations: [{ campaignId: 'cmp-01', amount: 0.5 }, { campaignId: 'cmp-02', amount: 5 }] }, 400, 'INVALID_AMOUNT'],
    ['amount 10.001', { allocations: [{ campaignId: 'cmp-01', amount: 10.001 }, { campaignId: 'cmp-02', amount: 5 }] }, 400, 'INVALID_AMOUNT'],
    ['total over 10000', { allocations: [{ campaignId: 'cmp-01', amount: 6000 }, { campaignId: 'cmp-02', amount: 6000 }] }, 400, 'INVALID_AMOUNT'],
    ['allocations not an array', { allocations: 'cmp-01' }, 400, 'INVALID_SPLIT'],
  ];
  for (const [name, body, status, code] of invalid) {
    test(`invalid: ${name} -> ${status} ${code}, no PayPal call, no rows`, async () => {
      const before = donationCount();
      const res = await createSplit(body);
      assert.equal(res.status, status);
      assert.equal(res.body.error, code);
      assert.equal(fake.calls.length, 0);
      assert.equal(donationCount(), before);
      assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM split_orders').get().n, 0);
    });
  }

  test('unauthenticated -> 401', async () => {
    const res = await request(ctx.app).post('/api/donations/split-orders').send(SPLIT);
    assert.equal(res.status, 401);
    assert.equal(fake.calls.length, 0);
  });

  test('aiSuggested true is stored', async () => {
    const res = await createSplit({ ...SPLIT, aiSuggested: true });
    assert.equal(res.status, 201);
    assert.equal(ctx.db.prepare('SELECT ai_suggested FROM split_orders WHERE id = ?').get(res.body.splitId).ai_suggested, 1);
  });
});

describe('split donations: capture', () => {
  test('capture credits each campaign once; repeat capture makes no PayPal call', async () => {
    const r1 = raised('cmp-01');
    const r2 = raised('cmp-02');
    const created = await createSplit(SPLIT);
    const res = await captureSplit(created.body.orderId);
    assert.equal(res.status, 200);
    assert.equal(res.body.split.status, 'COMPLETED');
    assert.equal(res.body.split.total, 10);
    assert.equal(res.body.split.donations.length, 2);
    assert.ok(res.body.split.donations.every((d) => d.status === 'COMPLETED' && /^CAP-/.test(d.paypalCaptureId)));
    assert.deepEqual(res.body.campaigns.map((c) => c.id), ['cmp-01', 'cmp-02']);
    assert.equal(raised('cmp-01'), r1 + 600);
    assert.equal(raised('cmp-02'), r2 + 400);
    assert.equal(captureCalls()[0].headers['PayPal-Request-Id'], 'cap-' + created.body.splitId);
    assert.ok(auditActions().includes('DONATION_SPLIT_CAPTURED'));

    const again = await captureSplit(created.body.orderId);
    assert.equal(again.status, 200);
    assert.equal(again.body.split.status, 'COMPLETED');
    assert.equal(raised('cmp-01'), r1 + 600);
    assert.equal(raised('cmp-02'), r2 + 400);
    assert.equal(captureCalls().length, 1);
  });

  test('COMPLETED webhooks after the capture endpoint do not credit again', async () => {
    const r1 = raised('cmp-01');
    const r2 = raised('cmp-02');
    const created = await createSplit(SPLIT);
    const captured = await captureSplit(created.body.orderId);
    let i = 0;
    for (const d of captured.body.split.donations) {
      i += 1;
      const res = await postWebhook(
        captureCompleted(`WH-SPLIT-${i}`, { captureId: d.paypalCaptureId, donationId: d.id, value: d.amount.toFixed(2) }),
      );
      assert.equal(res.status, 200);
    }
    assert.equal(raised('cmp-01'), r1 + 600);
    assert.equal(raised('cmp-02'), r2 + 400);
  });

  test('COMPLETED webhooks before the capture endpoint credit once and complete the split', async () => {
    const r1 = raised('cmp-01');
    const r2 = raised('cmp-02');
    const created = await createSplit(SPLIT);
    const [d1, d2] = created.body.donationIds;
    assert.equal((await postWebhook(captureCompleted('WH-A', { captureId: 'CAP-W1', donationId: d1, value: '6.00' }))).status, 200);
    assert.equal(
      ctx.db.prepare('SELECT status FROM split_orders WHERE id = ?').get(created.body.splitId).status,
      'PARTIALLY_COMPLETED',
    );
    assert.equal((await postWebhook(captureCompleted('WH-B', { captureId: 'CAP-W2', donationId: d2, value: '4.00' }))).status, 200);
    assert.equal(ctx.db.prepare('SELECT status FROM split_orders WHERE id = ?').get(created.body.splitId).status, 'COMPLETED');
    assert.equal(raised('cmp-01'), r1 + 600);
    assert.equal(raised('cmp-02'), r2 + 400);

    // Same capture reported again under a new event id: still credited once.
    await postWebhook(captureCompleted('WH-C', { captureId: 'CAP-W1', donationId: d1, value: '6.00' }));
    assert.equal(raised('cmp-01'), r1 + 600);

    const res = await captureSplit(created.body.orderId);
    assert.equal(res.status, 200);
    assert.equal(res.body.split.status, 'COMPLETED');
    assert.equal(captureCalls().length, 0);
    assert.equal(raised('cmp-01'), r1 + 600);
    assert.equal(raised('cmp-02'), r2 + 400);
  });

  test('207 partial capture credits only the captured unit', async () => {
    fake.state.splitCaptureStatus = { 'cmp-02': 'DECLINED' };
    const r1 = raised('cmp-01');
    const r2 = raised('cmp-02');
    const created = await createSplit(SPLIT);
    const res = await captureSplit(created.body.orderId);
    assert.equal(res.status, 200);
    assert.equal(res.body.split.status, 'PARTIALLY_COMPLETED');
    assert.equal(raised('cmp-01'), r1 + 600);
    assert.equal(raised('cmp-02'), r2);
    const [d1, d2] = created.body.donationIds.map((id) => ctx.db.prepare('SELECT * FROM donations WHERE id = ?').get(id));
    assert.equal(d1.status, 'COMPLETED');
    assert.equal(d2.status, 'FAILED');
    assert.equal(d2.counted, 0);
  });

  test('all units declined -> 502 PAYPAL_ERROR, totals unchanged, audited', async () => {
    fake.state.splitCaptureStatus = { 'cmp-01': 'DECLINED', 'cmp-02': 'DECLINED' };
    const r1 = raised('cmp-01');
    const r2 = raised('cmp-02');
    const created = await createSplit(SPLIT);
    const res = await captureSplit(created.body.orderId);
    assert.equal(res.status, 502);
    assert.equal(res.body.error, 'PAYPAL_ERROR');
    assert.equal(raised('cmp-01'), r1);
    assert.equal(raised('cmp-02'), r2);
    assert.ok(auditActions().includes('DONATION_SPLIT_CAPTURE_FAILED'));
  });

  test('split order id on the single-campaign capture endpoint -> 404', async () => {
    const created = await createSplit(SPLIT);
    const res = await request(ctx.app).post(`/api/donations/orders/${created.body.orderId}/capture`).set(bearer(token)).send();
    assert.equal(res.status, 404);
    assert.equal(captureCalls().length, 0);
  });

  test('unknown split order -> 404', async () => {
    const res = await captureSplit('ORDER-NOPE');
    assert.equal(res.status, 404);
  });
});

describe('AI suggest split', () => {
  const GOOD = {
    allocations: [
      { campaignId: 'cmp-01', percent: 70 },
      { campaignId: 'cmp-02', percent: 30 },
    ],
    rationale: 'cmp-01 is less funded',
  };

  async function withGroq(content, configOverrides = {}) {
    const groq = makeFakeGroq([{ content: JSON.stringify(content) }]);
    const c = makeTestContext({ paypalFetch: fake.fetch, groqFetch: groq.fetch, configOverrides });
    const t = await loginAs(c.app, DONOR);
    return { c, t, groq };
  }

  test('200 with percentages and rationale, strict json_schema, no PayPal call', async () => {
    const { c, t, groq } = await withGroq(GOOD);
    const res = await request(c.app).post('/api/ai/suggest-split').set(bearer(t)).send({ amount: 50 });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.allocations.map((a) => [a.campaignId, a.percent]), [['cmp-01', 70], ['cmp-02', 30]]);
    assert.ok(res.body.allocations.every((a) => typeof a.title === 'string'));
    assert.equal(res.body.rationale, 'cmp-01 is less funded');
    assert.equal(res.body.model, c.config.groq.model);

    assert.equal(groq.requests.length, 1);
    const sent = groq.requests[0];
    assert.equal(sent.response_format.type, 'json_schema');
    assert.equal(sent.response_format.json_schema.strict, true);
    assert.equal(sent.tools, undefined);
    assert.equal(sent.reasoning_effort, 'low');
    const listed = JSON.parse(sent.messages[1].content).campaigns.map((x) => x.id);
    assert.deepEqual(listed, ['cmp-01', 'cmp-02']);

    assert.ok(c.db.prepare("SELECT 1 FROM audit_logs WHERE action = 'AI_SPLIT_SUGGESTED'").get());
    assert.equal(c.calls.filter((x) => x.client === 'paypal').length, 0);
  });

  const bad = [
    ['unknown campaign id', { ...GOOD, allocations: [{ campaignId: 'cmp-01', percent: 70 }, { campaignId: 'cmp-77', percent: 30 }] }],
    ['sum 90', { ...GOOD, allocations: [{ campaignId: 'cmp-01', percent: 60 }, { campaignId: 'cmp-02', percent: 30 }] }],
    [
      'inactive campaign included',
      { ...GOOD, allocations: [{ campaignId: 'cmp-01', percent: 50 }, { campaignId: 'cmp-02', percent: 30 }, { campaignId: 'cmp-03', percent: 20 }] },
    ],
  ];
  for (const [name, content] of bad) {
    test(`invalid AI output (${name}) -> 502 AI_INVALID_SUGGESTION`, async () => {
      const { c, t } = await withGroq(content);
      const res = await request(c.app).post('/api/ai/suggest-split').set(bearer(t)).send({ amount: 50 });
      assert.equal(res.status, 502);
      assert.equal(res.body.error, 'AI_INVALID_SUGGESTION');
    });
  }

  test('GROQ_API_KEY empty -> 503 AI_NOT_CONFIGURED', async () => {
    const { c, t, groq } = await withGroq(GOOD, { GROQ_API_KEY: '' });
    const res = await request(c.app).post('/api/ai/suggest-split').set(bearer(t)).send({ amount: 50 });
    assert.equal(res.status, 503);
    assert.equal(res.body.error, 'AI_NOT_CONFIGURED');
    assert.equal(groq.requests.length, 0);
  });

  test('amount 0 -> 400 INVALID_AMOUNT', async () => {
    const { c, t, groq } = await withGroq(GOOD);
    const res = await request(c.app).post('/api/ai/suggest-split').set(bearer(t)).send({ amount: 0 });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'INVALID_AMOUNT');
    assert.equal(groq.requests.length, 0);
  });

  test('unauthenticated -> 401', async () => {
    const res = await request(ctx.app).post('/api/ai/suggest-split').send({ amount: 50 });
    assert.equal(res.status, 401);
  });
});
