import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { SEED_USERS } from '../src/db/seedData.js';
import { loginAs, makeTestContext } from './helpers.js';

let ctx;
beforeEach(() => {
  ctx = makeTestContext();
});

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe('auth', () => {
  for (const u of SEED_USERS) {
    test(`login succeeds for ${u.role} ${u.email}`, async () => {
      const res = await request(ctx.app).post('/api/auth/login').send({ email: u.email, password: 'password123' });
      assert.equal(res.status, 200);
      assert.equal(res.body.user.id, u.id);
      assert.equal(res.body.user.password_hash, undefined);
      const claims = jwt.verify(res.body.token, 'test-secret', { algorithms: ['HS256'] });
      assert.equal(claims.role, u.role);
      assert.equal(claims.sub, u.id);
    });
  }

  test('passwords are stored as bcrypt hashes', () => {
    const row = ctx.db.prepare('SELECT password_hash FROM users WHERE id = ?').get('usr-1');
    assert.match(row.password_hash, /^\$2[aby]\$/);
    assert.notEqual(row.password_hash, 'password123');
  });

  test('wrong password -> 401', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'alok.v@reliefpay.org', password: 'nope' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'INVALID_CREDENTIALS');
  });

  test('GET /api/auth/me without token -> 401', async () => {
    const res = await request(ctx.app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHENTICATED');
  });

  test('GET /api/auth/me with tampered token -> 401', async () => {
    const token = await loginAs(ctx.app, 'mehta.r@techcorp.in');
    const [h, p, s] = token.split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    payload.role = 'ADMIN';
    const forged = [h, Buffer.from(JSON.stringify(payload)).toString('base64url'), s].join('.');
    const res = await request(ctx.app).get('/api/auth/me').set(bearer(forged));
    assert.equal(res.status, 401);
  });

  test('GET /api/auth/me rejects alg=none tokens', async () => {
    const unsigned = jwt.sign({ sub: 'usr-1', role: 'ADMIN' }, null, { algorithm: 'none' });
    const res = await request(ctx.app).get('/api/auth/me').set(bearer(unsigned));
    assert.equal(res.status, 401);
  });

  test('GET /api/auth/me with valid token -> user without password_hash', async () => {
    const token = await loginAs(ctx.app, 'elena@auditcore.org');
    const res = await request(ctx.app).get('/api/auth/me').set(bearer(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'elena@auditcore.org');
    assert.equal(res.body.user.role, 'AUDITOR');
    assert.equal('password_hash' in res.body.user, false);
  });

  test('signup as DONOR -> 201 and can call /api/auth/me', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/signup')
      .send({ name: 'New Donor', email: 'new.donor@example.com', password: 'secret12', role: 'DONOR' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'DONOR');
    const me = await request(ctx.app).get('/api/auth/me').set(bearer(res.body.token));
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'new.donor@example.com');
    const audit = ctx.db.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'USER_SIGNUP'").get();
    assert.equal(audit.n, 1);
  });

  test('signup with role ADMIN -> 400', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/signup')
      .send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'secret12', role: 'ADMIN' });
    assert.equal(res.status, 400);
  });

  test('signup with duplicate email -> 409', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/signup')
      .send({ name: 'Dup', email: 'MEHTA.R@techcorp.in', password: 'secret12', role: 'DONOR' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'EMAIL_TAKEN');
  });
});

describe('role checks', () => {
  test('DONOR GET /api/audit-logs -> 403', async () => {
    const token = await loginAs(ctx.app, 'mehta.r@techcorp.in');
    const res = await request(ctx.app).get('/api/audit-logs').set(bearer(token));
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'FORBIDDEN');
  });

  test('AUDITOR GET /api/audit-logs -> 200 with seeded logs', async () => {
    const token = await loginAs(ctx.app, 'elena@auditcore.org');
    const res = await request(ctx.app).get('/api/audit-logs').set(bearer(token));
    assert.equal(res.status, 200);
    const ids = res.body.logs.map((l) => l.id);
    for (const id of ['LOG-7701', 'LOG-7702', 'LOG-7703']) assert.ok(ids.includes(id), id);
    const seeded = res.body.logs.find((l) => l.id === 'LOG-7701');
    assert.equal(seeded.actor, 'Sarah Jenkins (Reviewer)');
    assert.equal(seeded.status, 'VERIFIED');
  });

  test('BENEFICIARY PATCH application status -> 403', async () => {
    const token = await loginAs(ctx.app, 'ayesha.k@gmail.com');
    const res = await request(ctx.app)
      .patch('/api/applications/RPA-2026-0012/status')
      .set(bearer(token))
      .send({ status: 'APPROVED' });
    assert.equal(res.status, 403);
  });

  test('REVIEWER APPROVED -> 200, persisted, audited', async () => {
    const token = await loginAs(ctx.app, 's.jenkins@reliefpay.org');
    const res = await request(ctx.app)
      .patch('/api/applications/RPA-2026-0012/status')
      .set(bearer(token))
      .send({ status: 'APPROVED', approvedAmount: 125.5 });
    assert.equal(res.status, 200);
    assert.equal(res.body.application.status, 'APPROVED');
    assert.equal(res.body.application.approvedAmount, 125.5);
    const row = ctx.db.prepare('SELECT status, approved_cents FROM applications WHERE id = ?').get('RPA-2026-0012');
    assert.equal(row.status, 'APPROVED');
    assert.equal(row.approved_cents, 12550);
    const audit = ctx.db
      .prepare("SELECT * FROM audit_logs WHERE action = 'APPLICATION_APPROVED' AND target = 'Application RPA-2026-0012'")
      .get();
    assert.ok(audit);
    assert.equal(audit.status, 'VERIFIED');
    assert.equal(audit.actor_id, 'usr-2');
  });

  test('REJECTED without remarks -> 400', async () => {
    const token = await loginAs(ctx.app, 's.jenkins@reliefpay.org');
    const res = await request(ctx.app)
      .patch('/api/applications/RPA-2026-0012/status')
      .set(bearer(token))
      .send({ status: 'REJECTED' });
    assert.equal(res.status, 400);
  });
});

describe('public endpoints', () => {
  test('GET /api/campaigns returns 3 campaigns with raisedAmount 3680 for cmp-01', async () => {
    const res = await request(ctx.app).get('/api/campaigns');
    assert.equal(res.status, 200);
    assert.equal(res.body.campaigns.length, 3);
    const c1 = res.body.campaigns.find((c) => c.id === 'cmp-01');
    assert.equal(c1.raisedAmount, 3680);
    assert.equal(c1.disbursedAmount, 2400);
    assert.equal(c1.availableAmount, 1280);
    assert.equal(c1.currency, 'USD');
  });

  test('GET /api/config exposes no secrets', async () => {
    const res = await request(ctx.app).get('/api/config');
    assert.equal(res.status, 200);
    assert.equal(res.body.paypalClientId, 'test-client');
    assert.equal(res.body.paypalEnvironment, 'sandbox');
    assert.equal(res.body.payoutAuthConfigured, true);
    const text = JSON.stringify(res.body);
    for (const secret of ['test-secret', 'WH-TEST', '246810', 'test-groq']) {
      assert.equal(text.includes(secret), false, secret);
    }
  });

  test('unknown /api path -> JSON 404', async () => {
    const res = await request(ctx.app).get('/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'NOT_FOUND');
  });
});
