// Read-only data for the AG Studio analytics page (GET /api/analytics).
// Flat tables, money in dollars. Never includes receiver emails, PayPal ids
// or user ids: the donor leaderboard gets a rank-based id instead.

import { campaignAvailableCents, toDollars } from './campaigns.js';

function campaignsTable(db) {
  return db
    .prepare('SELECT * FROM campaigns ORDER BY id')
    .all()
    .map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      disasterType: row.disaster_type,
      location: row.location,
      target: toDollars(row.target_cents),
      raised: toDollars(row.raised_cents),
      disbursed: toDollars(row.disbursed_cents),
      available: toDollars(campaignAvailableCents(db, row.id)),
      fundedPct: row.target_cents > 0 ? row.raised_cents / row.target_cents : 0,
      beneficiaries: row.beneficiaries_count,
    }));
}

function donationsTable(db) {
  return db
    .prepare('SELECT * FROM donations ORDER BY created_at DESC, rowid DESC')
    .all()
    .map((row) => {
      const refunded = row.refunded_cents ?? 0;
      return {
        id: row.id,
        campaignId: row.campaign_id,
        donorName: row.donor_name || 'Anonymous',
        amount: toDollars(row.amount_cents),
        refundedAmount: toDollars(refunded),
        netAmount: row.status === 'COMPLETED' ? toDollars(row.amount_cents - refunded) : 0,
        status: row.status,
        kind: row.split_order_id ? 'SPLIT' : 'SINGLE',
        splitOrderId: row.split_order_id ?? null,
        createdAt: row.created_at,
      };
    });
}

function donorsTable(db) {
  return db
    .prepare(
      `SELECT COALESCE(user_id, donor_name, 'Anonymous') AS donor_key,
              MAX(donor_name) AS donor_name,
              COUNT(*) AS donation_count,
              SUM(amount_cents - refunded_cents) AS net_cents,
              MAX(created_at) AS last_at
         FROM donations
        WHERE status = 'COMPLETED'
        GROUP BY donor_key
        ORDER BY net_cents DESC, last_at DESC`,
    )
    .all()
    .map((row, i) => ({
      id: `DNR-${i + 1}`,
      donorName: row.donor_name || 'Anonymous',
      donationCount: Number(row.donation_count),
      totalDonated: toDollars(Number(row.net_cents)),
      lastDonationAt: row.last_at,
    }));
}

function refundsTable(db) {
  return db
    .prepare(
      `SELECT r.*, d.campaign_id
         FROM refunds r JOIN donations d ON d.id = r.donation_id
        ORDER BY r.created_at DESC, r.rowid DESC`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      donationId: row.donation_id,
      campaignId: row.campaign_id,
      amount: toDollars(row.applied_cents),
      requestedAmount: toDollars(row.amount_cents),
      status: row.status,
      source: row.source,
      eventType: row.event_type ?? null,
      createdAt: row.created_at,
    }));
}

function payoutBatchesTable(db) {
  return db
    .prepare(
      `SELECT pb.*, (SELECT COUNT(*) FROM payout_items pi WHERE pi.batch_id = pb.id) AS item_count
         FROM payout_batches pb
        ORDER BY pb.created_at DESC, pb.rowid DESC`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      status: row.status,
      total: toDollars(row.total_cents),
      itemCount: Number(row.item_count),
      draftedByAi: Boolean(row.drafted_by_ai),
      createdAt: row.created_at,
      releasedAt: row.released_at ?? null,
    }));
}

function payoutItemsTable(db) {
  return db
    .prepare(
      `SELECT pi.id, pi.batch_id, pi.amount_cents, pi.status, a.beneficiary_name
         FROM payout_items pi JOIN applications a ON a.id = pi.application_id
        ORDER BY pi.batch_id, pi.rowid`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      batchId: row.batch_id,
      beneficiaryName: row.beneficiary_name,
      amount: toDollars(row.amount_cents),
      status: row.status,
    }));
}

export function getAnalytics(db, config) {
  return {
    asOf: new Date().toISOString(),
    currency: config.paypal.currency,
    campaigns: campaignsTable(db),
    donations: donationsTable(db),
    donors: donorsTable(db),
    refunds: refundsTable(db),
    payoutBatches: payoutBatchesTable(db),
    payoutItems: payoutItemsTable(db),
    studio: {
      licenseKey: config.agStudio.licenseKey ?? null,
      aiEnabled: Boolean(config.groq.apiKey) && config.agStudio.aiEnabled,
      aiModels: [config.groq.model],
    },
  };
}
