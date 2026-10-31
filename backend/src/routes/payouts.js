import { Router } from 'express';
import { actorFromUser } from '../audit.js';
import { requireAuth, requireRole } from '../auth.js';
import { draftPayoutBatch, listPayoutBatches, releasePayoutBatch, syncPayoutBatch } from '../services/payouts.js';

export function payoutsRouter({ db, config, paypal }) {
  const router = Router();
  const auth = requireAuth(db, config);
  const admin = requireRole('ADMIN');

  router.get('/payouts', auth, requireRole('ADMIN', 'AUDITOR'), (req, res) => {
    res.json({ batches: listPayoutBatches(db) });
  });

  router.post('/payouts', auth, admin, (req, res) => {
    const { campaignId, applicationIds, note } = req.body ?? {};
    const batch = draftPayoutBatch(db, config, {
      actor: actorFromUser(req.user),
      userId: req.user.id,
      campaignId,
      applicationIds,
      note,
      draftedByAi: false,
    });
    res.status(201).json({ batch });
  });

  router.post('/payouts/:id/release', auth, admin, async (req, res) => {
    const batch = await releasePayoutBatch(db, paypal, config, {
      user: req.user,
      batchId: req.params.id,
      authCode: req.body?.authCode,
    });
    res.json({ batch });
  });

  router.post('/payouts/:id/sync', auth, admin, async (req, res) => {
    const batch = await syncPayoutBatch(db, paypal, { actor: actorFromUser(req.user), batchId: req.params.id });
    res.json({ batch });
  });

  return router;
}
