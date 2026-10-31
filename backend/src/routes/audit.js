import { Router } from 'express';
import { listAudit } from '../audit.js';
import { requireAuth, requireRole } from '../auth.js';

export function auditRouter({ db, config }) {
  const router = Router();

  router.get('/audit-logs', requireAuth(db, config), requireRole('ADMIN', 'AUDITOR'), (req, res) => {
    res.json({ logs: listAudit(db) });
  });

  return router;
}
