import { Router } from 'express';
import { getCampaign, listCampaigns } from '../services/campaigns.js';

export function campaignsRouter({ db }) {
  const router = Router();

  router.get('/campaigns', (req, res) => {
    res.json({ campaigns: listCampaigns(db) });
  });

  router.get('/campaigns/:id', (req, res) => {
    const campaign = getCampaign(db, req.params.id);
    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ campaign });
  });

  return router;
}
