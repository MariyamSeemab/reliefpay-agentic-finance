import bcrypt from 'bcryptjs';
import { tx } from './index.js';
import {
  SEED_APPLICATIONS,
  SEED_AUDIT_LOGS,
  SEED_CAMPAIGNS,
  SEED_DONATIONS,
  SEED_PASSWORD,
  SEED_PAYOUT_BATCH,
  SEED_USERS,
} from './seedData.js';

export function seedIfEmpty(db, { bcryptRounds = 10 } = {}) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return false;

  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(SEED_PASSWORD, bcryptRounds);

  tx(db, () => {
    const insertUser = db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, org, title, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const u of SEED_USERS) {
      insertUser.run(u.id, u.name, u.email, passwordHash, u.role, u.org, u.title, now);
    }

    const insertCampaign = db.prepare(
      `INSERT INTO campaigns (id, title, disaster_type, location, lat, lng, target_cents, raised_cents,
         disbursed_cents, status, beneficiaries_count, start_date, end_date, description, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD')`,
    );
    for (const c of SEED_CAMPAIGNS) {
      insertCampaign.run(
        c.id, c.title, c.disasterType, c.location, c.lat, c.lng, c.targetCents, c.raisedCents,
        c.disbursedCents, c.status, c.beneficiariesCount, c.startDate, c.endDate, c.description,
      );
    }

    const insertApplication = db.prepare(
      `INSERT INTO applications (id, beneficiary_name, phone, campaign_id, area, lat, lng, household_members,
         disaster_type, requested_cents, approved_cents, priority, status, paypal_email, remarks, submitted_at,
         ai_findings_json, timeline_json, documents_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    );
    for (const a of SEED_APPLICATIONS) {
      insertApplication.run(
        a.id, a.beneficiaryName, a.phone, a.campaignId, a.area, a.lat, a.lng, a.householdMembers,
        a.disasterType, a.requestedCents, a.approvedCents, a.priority, a.status, a.paypalEmail, a.submittedAt,
        JSON.stringify(a.aiFindings), JSON.stringify(a.timeline), JSON.stringify(a.documents), now,
      );
    }

    const insertDonation = db.prepare(
      `INSERT INTO donations (id, campaign_id, user_id, donor_name, amount_cents, currency, status, counted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'USD', 'COMPLETED', 1, ?, ?)`,
    );
    for (const d of SEED_DONATIONS) {
      insertDonation.run(d.id, d.campaignId, d.userId, d.donorName, d.amountCents, d.createdAt, d.createdAt);
    }

    const insertAudit = db.prepare(
      `INSERT INTO audit_logs (id, created_at, actor_id, actor_label, action, target, status, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    );
    for (const l of SEED_AUDIT_LOGS) {
      insertAudit.run(l.id, l.createdAt, l.actorId, l.actorLabel, l.action, l.target, l.status);
    }

    const b = SEED_PAYOUT_BATCH;
    const total = b.items.reduce((sum, i) => sum + i.amountCents, 0);
    db.prepare(
      `INSERT INTO payout_batches (id, campaign_id, status, total_cents, currency, note, created_by_user_id,
         drafted_by_ai, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?)`,
    ).run(b.id, b.campaignId, b.status, total, b.note, b.createdByUserId, b.draftedByAi, b.createdAt, b.createdAt);

    const emailByApp = new Map(SEED_APPLICATIONS.map((a) => [a.id, a.paypalEmail]));
    const insertItem = db.prepare(
      `INSERT INTO payout_items (id, batch_id, application_id, receiver_email, amount_cents, status, updated_at)
       VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)`,
    );
    for (const i of b.items) {
      insertItem.run(i.id, b.id, i.applicationId, emailByApp.get(i.applicationId), i.amountCents, b.createdAt);
    }
  });

  return true;
}
