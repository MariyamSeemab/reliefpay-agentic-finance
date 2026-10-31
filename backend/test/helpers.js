import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { openDb } from '../src/db/index.js';
import { seedIfEmpty } from '../src/db/seed.js';
import { createPayPalClient } from '../src/services/paypalClient.js';

export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function recordingFetch(name, impl, calls) {
  return async (url, init = {}) => {
    calls.push({ client: name, url: String(url), method: init.method || 'GET', headers: init.headers, body: init.body });
    if (!impl) throw new Error(`Unexpected ${name} network call in test: ${url}`);
    return impl(url, init);
  };
}

// Builds an app over a fresh in-memory seeded DB. PayPal and Groq never hit the
// network: tests pass fake fetch implementations, and every call is recorded in
// `calls`. The PayPal client is built from fetches.paypal (see paypal-fake.js);
// FEAT-003 builds the Groq client from fetches.groq.
export function makeTestContext({ configOverrides = {}, paypalFetch, groqFetch } = {}) {
  const config = readConfig({
    JWT_SECRET: 'test-secret',
    PAYOUT_AUTH_CODE: '246810',
    PAYPAL_CLIENT_ID: 'test-client',
    PAYPAL_CLIENT_SECRET: 'test-secret',
    PAYPAL_WEBHOOK_ID: 'WH-TEST',
    GROQ_API_KEY: 'test-groq',
    DATABASE_PATH: ':memory:',
    STATIC_DIR: path.join(os.tmpdir(), 'reliefpay-no-static-' + process.pid),
    ...configOverrides,
  });
  const db = openDb(':memory:');
  seedIfEmpty(db, { bcryptRounds: 4 });

  const calls = [];
  const fetches = {
    paypal: recordingFetch('paypal', paypalFetch, calls),
    groq: recordingFetch('groq', groqFetch, calls),
  };

  const paypal = createPayPalClient({ ...config.paypal, fetch: fetches.paypal });
  const app = createApp({ db, config, paypal, groq: null });
  return { app, db, config, calls, fetches, paypal };
}

export async function loginAs(app, email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  return res.body.token;
}
