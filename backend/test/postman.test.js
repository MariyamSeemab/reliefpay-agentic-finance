import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(import.meta.dirname, '..', '..', 'docs', 'postman');
const collectionText = fs.readFileSync(path.join(dir, 'ReliefPay.postman_collection.json'), 'utf8');
const environmentText = fs.readFileSync(path.join(dir, 'ReliefPay.postman_environment.json'), 'utf8');
const collection = JSON.parse(collectionText);
const environment = JSON.parse(environmentText);

function leaves(items) {
  return items.flatMap((item) => (Array.isArray(item.item) ? leaves(item.item) : [item]));
}

test('collection follows Postman v2.1', () => {
  assert.equal(collection.info.name, 'ReliefPay API');
  assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
  const all = leaves(collection.item);
  assert.ok(all.length > 0);
  for (const item of all) {
    assert.ok(item.request?.method, `${item.name} has a method`);
    assert.ok(item.request.url.raw.startsWith('{{baseUrl}}/api/'), `${item.name} url uses baseUrl`);
  }
});

test('login saves the token and required endpoints are covered', () => {
  const all = leaves(collection.item);
  const login = all.find((i) => i.request.method === 'POST' && i.request.url.raw === '{{baseUrl}}/api/auth/login');
  assert.ok(login);
  const exec = login.event.filter((e) => e.listen === 'test').flatMap((e) => e.script.exec).join('\n');
  assert.ok(exec.includes("pm.collectionVariables.set('token'"));

  const present = new Set(all.map((i) => `${i.request.method} ${i.request.url.raw.replace('{{baseUrl}}', '')}`));
  for (const required of [
    'GET /api/health',
    'GET /api/config',
    'POST /api/auth/login',
    'GET /api/campaigns',
    'POST /api/donations/orders',
    'POST /api/donations/split-orders',
    'POST /api/ai/chat',
    'POST /api/payouts',
    'GET /api/payouts',
    'GET /api/audit-logs',
    'GET /api/analytics',
  ]) {
    assert.ok(present.has(required), `missing ${required}`);
  }
});

test('environment defaults to Render and holds no secrets', () => {
  const values = Object.fromEntries(environment.values.map((v) => [v.key, v.value]));
  assert.equal(values.baseUrl, 'https://reliefpay.onrender.com');
  assert.equal(environment._postman_variable_scope, 'environment');
  assert.equal(values.adminPassword, '');
  assert.equal(values.token, '');
  const secretPattern = /password123|Bearer\s+ey|A21[A-Za-z0-9_-]{10,}|gsk_[A-Za-z0-9]{10,}|client_secret/i;
  assert.doesNotMatch(collectionText, secretPattern);
  assert.doesNotMatch(environmentText, secretPattern);
});
