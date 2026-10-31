import { Router } from 'express';

export function metaRouter({ config }) {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  // Public, non-secret configuration only. Never add client secret, webhook id,
  // payout auth code or API keys here.
  router.get('/config', (req, res) => {
    res.json({
      paypalClientId: config.paypal.clientId || null,
      currency: config.paypal.currency,
      paypalEnvironment: config.paypal.apiBase.includes('sandbox') ? 'sandbox' : 'live',
      aiEnabled: Boolean(config.groq.apiKey),
      aiModel: config.groq.model,
      payoutAuthConfigured: Boolean(config.payoutAuthCode),
    });
  });

  return router;
}
