import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','REVIEWER','BENEFICIARY','DONOR','VOLUNTEER','AUDITOR')),
  org TEXT,
  title TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
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

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  beneficiary_name TEXT NOT NULL,
  phone TEXT,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  area TEXT,
  lat REAL,
  lng REAL,
  household_members INTEGER,
  disaster_type TEXT,
  requested_cents INTEGER NOT NULL DEFAULT 0,
  approved_cents INTEGER,
  priority TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','DOCUMENT_REQUESTED')),
  paypal_email TEXT,
  remarks TEXT,
  submitted_at TEXT,
  ai_findings_json TEXT NOT NULL DEFAULT '[]',
  timeline_json TEXT NOT NULL DEFAULT '[]',
  documents_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS donations (
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

CREATE TABLE IF NOT EXISTS payout_batches (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  status TEXT NOT NULL CHECK (status IN ('DRAFT','RELEASING','RELEASE_FAILED','PENDING','PROCESSING','SUCCESS','DENIED','CANCELED')),
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  note TEXT,
  created_by_user_id TEXT,
  drafted_by_ai INTEGER NOT NULL DEFAULT 0,
  paypal_batch_id TEXT UNIQUE,
  failed_auth_attempts INTEGER NOT NULL DEFAULT 0,
  released_by_user_id TEXT,
  released_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS payout_items (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES payout_batches(id),
  application_id TEXT NOT NULL REFERENCES applications(id),
  receiver_email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  paypal_item_id TEXT,
  paypal_transaction_id TEXT,
  counted INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  actor_id TEXT,
  actor_label TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  status TEXT NOT NULL CHECK (status IN ('RECORDED','VERIFIED','REJECTED','FAILED')),
  details_json TEXT
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY, -- PayPal event id
  event_type TEXT,
  received_at TEXT NOT NULL,
  verification_status TEXT,
  processed INTEGER NOT NULL DEFAULT 0
);
`;

export function openDb(filePath) {
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA foreign_keys = ON');
  if (filePath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL');
  }
  db.exec(SCHEMA);
  return db;
}

export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
