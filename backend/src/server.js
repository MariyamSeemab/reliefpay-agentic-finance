import { createApp } from './app.js';
import { readConfig } from './config.js';
import { openDb } from './db/index.js';
import { seedIfEmpty } from './db/seed.js';

const config = readConfig();
const db = openDb(config.databasePath);
if (seedIfEmpty(db)) {
  console.log('[db] seeded demo data');
}

// FEAT-002 / FEAT-003 replace these with real PayPal and Groq clients.
const paypal = null;
const groq = null;

const app = createApp({ db, config, paypal, groq });
app.listen(config.port, () => {
  console.log(`ReliefPay API listening on http://localhost:${config.port}`);
});
