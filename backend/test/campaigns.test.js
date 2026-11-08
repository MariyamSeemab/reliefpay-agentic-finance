import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { loginAs, makeTestContext } from './helpers.js';

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
let ctx;
let admin;

beforeEach(async () => {
  ctx = makeTestContext();
  admin = await loginAs(ctx.app, 'alok.v@reliefpay.org');
});

const launch = (body, token = admin) => request(ctx.app).post('/api/campaigns').set(bearer(token)).send(body);

describe('POST /api/campaigns (Launch New Campaign)', () => {
  test('ADMIN creates an ACTIVE campaign with nothing raised, and it is audited', async () => {
    const res = await launch({ title: 'Chennai Cyclone Relief', disasterType: 'Cyclone', location: 'Chennai', targetAmount: 7500, description: 'Food and shelter' });
    assert.equal(res.status, 201);
    const c = res.body.campaign;
    assert.match(c.id, /^cmp-/);
    assert.equal(c.status, 'ACTIVE');
    assert.equal(c.targetAmount, 7500);
    assert.equal(c.raisedAmount, 0);
    assert.equal(c.currency, 'USD');
    const list = await request(ctx.app).get('/api/campaigns');
    assert.ok(list.body.campaigns.some((x) => x.id === c.id));
    const audit = ctx.db.prepare("SELECT * FROM audit_logs WHERE action = 'CAMPAIGN_CREATED'").get();
    assert.equal(audit.target, `Campaign ${c.id}`);
  });

  test('invalid title or target -> 400 and nothing is created', async () => {
    const before = ctx.db.prepare('SELECT COUNT(*) AS n FROM campaigns').get().n;
    for (const body of [{ title: 'ab', targetAmount: 100 }, { title: 'Valid title', targetAmount: 0 }, { title: 'Valid title', targetAmount: 10.001 }, { title: 'Valid title' }]) {
      const res = await launch(body);
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'INVALID_CAMPAIGN');
    }
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM campaigns').get().n, before);
  });

  test('only ADMIN can launch a campaign', async () => {
    const reviewer = await loginAs(ctx.app, 's.jenkins@reliefpay.org');
    const donor = await loginAs(ctx.app, 'mehta.r@techcorp.in');
    assert.equal((await launch({ title: 'Nope', targetAmount: 100 }, reviewer)).status, 403);
    assert.equal((await launch({ title: 'Nope', targetAmount: 100 }, donor)).status, 403);
    assert.equal((await request(ctx.app).post('/api/campaigns').send({ title: 'Nope', targetAmount: 100 })).status, 401);
  });
});
