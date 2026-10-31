import { Router } from 'express';
import { handlePayPalWebhook } from '../services/webhooks.js';

// No auth: PayPal calls this. Authenticity comes from signature verification.
export function webhooksRouter({ db, config, paypal }) {
  const router = Router();

  router.post('/webhooks/paypal', async (req, res) => {
    const result = await handlePayPalWebhook(db, paypal, config, { headers: req.headers, event: req.body });
    res.json(result);
  });

  return router;
}
