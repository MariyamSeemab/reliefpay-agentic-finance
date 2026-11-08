import crypto from 'node:crypto';

// Shared campaign helpers (FEAT-002 payouts reuse campaignAvailableCents).

export const RESERVED_ITEM_STATUSES = ['PENDING', 'UNCLAIMED', 'ONHOLD'];

export function reservedCents(db, campaignId) {
  const placeholders = RESERVED_ITEM_STATUSES.map(() => '?').join(',');
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(pi.amount_cents), 0) AS reserved
         FROM payout_items pi
         JOIN payout_batches pb ON pb.id = pi.batch_id
        WHERE pb.campaign_id = ? AND pi.counted = 0 AND pi.status IN (${placeholders})`,
    )
    .get(campaignId, ...RESERVED_ITEM_STATUSES);
  return Number(row.reserved);
}

export function campaignAvailableCents(db, campaignId) {
  const c = db.prepare('SELECT raised_cents, disbursed_cents FROM campaigns WHERE id = ?').get(campaignId);
  if (!c) return 0;
  return c.raised_cents - c.disbursed_cents - reservedCents(db, campaignId);
}

export function toDollars(cents) {
  return cents == null ? null : cents / 100;
}

export function mapCampaign(db, row) {
  return {
    id: row.id,
    title: row.title,
    disasterType: row.disaster_type,
    location: row.location,
    coordinates: [row.lat, row.lng],
    targetAmount: toDollars(row.target_cents),
    raisedAmount: toDollars(row.raised_cents),
    disbursedAmount: toDollars(row.disbursed_cents),
    availableAmount: toDollars(campaignAvailableCents(db, row.id)),
    status: row.status,
    beneficiariesCount: row.beneficiaries_count,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    currency: row.currency,
  };
}

export function listCampaigns(db) {
  return db.prepare('SELECT * FROM campaigns ORDER BY id').all().map((r) => mapCampaign(db, r));
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// ADMIN creates a new ACTIVE campaign with nothing raised yet.
export function createCampaign(db, { title, disasterType, location, targetAmount, description, currency }) {
  const cleanTitle = cleanText(title, 120);
  if (cleanTitle.length < 3) {
    const err = new Error('Title must be at least 3 characters');
    err.code = 'INVALID_CAMPAIGN';
    throw err;
  }
  const amount = Number(targetAmount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000 || Math.round(amount * 100) !== amount * 100) {
    const err = new Error('Target must be between 1 and 1,000,000 USD with at most 2 decimals');
    err.code = 'INVALID_CAMPAIGN';
    throw err;
  }
  const id = `cmp-${crypto.randomUUID().slice(0, 8)}`;
  const today = new Date();
  const end = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  db.prepare(
    `INSERT INTO campaigns (id, title, disaster_type, location, lat, lng, target_cents, raised_cents, disbursed_cents,
                            status, beneficiaries_count, start_date, end_date, description, currency)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, 0, 0, 'ACTIVE', 0, ?, ?, ?, ?)`,
  ).run(
    id,
    cleanTitle,
    cleanText(disasterType, 60) || 'Relief',
    cleanText(location, 120),
    Math.round(amount * 100),
    today.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
    cleanText(description, 1000),
    currency,
  );
  return getCampaign(db, id);
}

export function getCampaign(db, id) {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  return row ? mapCampaign(db, row) : null;
}
