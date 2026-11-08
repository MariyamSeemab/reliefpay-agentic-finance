import { Router } from 'express';
import { actorFromUser, writeAudit } from '../audit.js';
import { requireAuth, requireRole } from '../auth.js';
import { createCampaign, getCampaign, listCampaigns } from '../services/campaigns.js';

export function campaignsRouter({ db, config }) {
  const router = Router();

  router.get('/campaigns', (req, res) => {
    res.json({ campaigns: listCampaigns(db) });
  });

  router.get('/campaigns/:id', (req, res) => {
    const campaign = getCampaign(db, req.params.id);
    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ campaign });
  });

  // Launch New Campaign on the admin dashboard.
  router.post('/campaigns', requireAuth(db, config), requireRole('ADMIN'), (req, res) => {
    let campaign;
    try {
      campaign = createCampaign(db, { ...(req.body ?? {}), currency: config.paypal.currency });
    } catch (err) {
      if (err.code === 'INVALID_CAMPAIGN') return res.status(400).json({ error: 'INVALID_CAMPAIGN', message: err.message });
      throw err;
    }
    writeAudit(db, {
      actor: actorFromUser(req.user),
      action: 'CAMPAIGN_CREATED',
      target: `Campaign ${campaign.id}`,
      status: 'RECORDED',
      details: { title: campaign.title, targetAmount: campaign.targetAmount },
    });
    return res.status(201).json({ campaign });
  });

  return router;
}
