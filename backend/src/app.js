import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { applicationsRouter } from './routes/applications.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { metaRouter } from './routes/meta.js';

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
  // FEAT-002 mount point: donations, payouts and webhooks routers.
  // FEAT-003 mount point: ai router.

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'NOT_FOUND' });
  });

  const indexFile = path.join(config.staticDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    app.use(express.static(config.staticDir));
    app.use((req, res, next) =>
      req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(indexFile) : next(),
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
    console.error('[error]', err);
    return res.status(500).json({ error: 'INTERNAL' });
  });

  return app;
}
