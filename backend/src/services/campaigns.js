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

export function getCampaign(db, id) {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  return row ? mapCampaign(db, row) : null;
}
