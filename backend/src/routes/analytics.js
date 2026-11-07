import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { getAnalytics } from '../services/analytics.js';

export function analyticsRouter({ db, config }) {
  const router = Router();

  router.get('/analytics', requireAuth(db, config), requireRole('ADMIN', 'AUDITOR'), (req, res) => {
    res.json(getAnalytics(db, config));
  });

  return router;
}
