import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, describe, test } from 'node:test';
import { openDb } from '../src/db/index.js';

const file = path.join(os.tmpdir(), `reliefpay-migration-${process.pid}-${crypto.randomUUID().slice(0, 8)}.db`);

// DDL as it was before refunds and split donations existed.
const OLD_SCHEMA = `
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  disaster_type TEXT,
  location TEXT,
  lat REAL,
  lng REAL,
  target_cents INTEGER NOT NULL DEFAULT 0,
  raised_cents INTEGER NOT NULL DEFAULT 0,
  disbursed_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  beneficiaries_count INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD'
);
CREATE TABLE donations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  user_id TEXT,
  donor_name TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('PENDING','COMPLETED','FAILED')),
  paypal_order_id TEXT UNIQUE,
  paypal_capture_id TEXT UNIQUE,
  counted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
INSERT INTO campaigns (id, title, raised_cents, status) VALUES ('cmp-old', 'Old campaign', 2500, 'ACTIVE');
INSERT INTO donations (id, campaign_id, amount_cents, status, paypal_capture_id, counted, created_at)
  VALUES ('DON-old', 'cmp-old', 2500, 'COMPLETED', 'CAP-old', 1, '2026-01-01T00:00:00.000Z');
`;

after(() => {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
});

describe('db migration', () => {
  test('openDb upgrades an old DB in place and is idempotent', () => {
    const old = new DatabaseSync(file);
    old.exec(OLD_SCHEMA);
    old.close();

    const db = openDb(file);
    const columns = db.prepare('PRAGMA table_info(donations)').all().map((c) => c.name);
    assert.ok(columns.includes('refunded_cents'));
    assert.ok(columns.includes('split_order_id'));
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name);
    assert.ok(tables.includes('split_orders'));
    assert.ok(tables.includes('refunds'));
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map((t) => t.name);
    assert.ok(indexes.includes('idx_donations_split'));
    assert.ok(indexes.includes('idx_refunds_donation'));
    const row = db.prepare("SELECT * FROM donations WHERE id = 'DON-old'").get();
    assert.equal(row.amount_cents, 2500);
    assert.equal(row.refunded_cents, 0);
    assert.equal(row.split_order_id, null);
    db.close();

    const again = openDb(file);
    assert.equal(again.prepare('SELECT COUNT(*) AS n FROM donations').get().n, 1);
    assert.equal(again.prepare('PRAGMA table_info(donations)').all().filter((c) => c.name === 'refunded_cents').length, 1);
    again.close();
  });
});
