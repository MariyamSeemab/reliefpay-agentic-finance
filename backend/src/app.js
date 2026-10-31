import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { aiRouter } from './routes/ai.js';
import { applicationsRouter } from './routes/applications.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { donationsRouter } from './routes/donations.js';
import { metaRouter } from './routes/meta.js';
import { payoutsRouter } from './routes/payouts.js';
import { webhooksRouter } from './routes/webhooks.js';
import { HttpError } from './errors.js';
import { PayPalError } from './services/paypalClient.js';

export function createApp({ db, config, paypal = null, groq = null }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const deps = { db, config, paypal, groq };
  app.use('/api', metaRouter(deps));
  app.use('/api', authRouter(deps));
  app.use('/api', campaignsRouter(deps));
  app.use('/api', applicationsRouter(deps));
  app.use('/api', auditRouter(deps));
  app.use('/api', donationsRouter(deps));
  app.use('/api', payoutsRouter(deps));
  app.use('/api', webhooksRouter(deps));
  app.use('/api', aiRouter(deps));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'NOT_FOUND' });
  });

  const indexFile = path.join(config.staticDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    app.use(express.static(config.staticDir));
    app.use((req, res, next) =>
      // `root` keeps send's dotfile check off the absolute path (e.g. a checkout under .worktrees/).
      req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile('index.html', { root: config.staticDir }) : next(),
    );
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'INVALID_JSON' });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.code, message: err.message, ...err.extra });
    }
    if (err instanceof PayPalError) {
      console.error('[paypal]', err.status, err.paypalName, err.debugId);
      return res.status(502).json({ error: 'PAYPAL_ERROR', paypalName: err.paypalName ?? null, debugId: err.debugId ?? null });
    }
    console.error('[error]', err);
    return res.status(500).json({ error: 'INTERNAL' });
  });

  return app;
}
