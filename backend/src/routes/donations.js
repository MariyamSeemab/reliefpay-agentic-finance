import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { captureDonationOrder, createDonationOrder, listDonations } from '../services/donations.js';

export function donationsRouter({ db, config, paypal }) {
  const router = Router();
  const auth = requireAuth(db, config);

  router.post('/donations/orders', auth, async (req, res) => {
    const { campaignId, amount } = req.body ?? {};
    const result = await createDonationOrder(db, paypal, config, { user: req.user, campaignId, amount });
    res.status(201).json(result);
  });

  router.post('/donations/orders/:orderId/capture', auth, async (req, res) => {
    const result = await captureDonationOrder(db, paypal, { user: req.user, orderId: req.params.orderId });
    res.json(result);
  });

  router.get('/donations', auth, requireRole('ADMIN', 'AUDITOR'), (req, res) => {
    res.json({ donations: listDonations(db) });
  });

  return router;
}
