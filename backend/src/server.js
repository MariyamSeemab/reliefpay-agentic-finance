import { createBedrockStudioClient } from './ai/bedrockStudio.js';
import { createGroqClient } from './ai/groqClient.js';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { openDb } from './db/index.js';
import { seedIfEmpty } from './db/seed.js';
import { createPayPalClient } from './services/paypalClient.js';

const config = readConfig();
const db = openDb(config.databasePath);
if (seedIfEmpty(db)) {
  console.log('[db] seeded demo data');
}

// Without credentials the client still exists; its methods throw 503
// PAYPAL_NOT_CONFIGURED so the app starts and reports the problem per request.
const paypal = createPayPalClient(config.paypal);
if (!paypal.isConfigured) {
  console.warn('[paypal] PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set; PayPal endpoints return 503');
}
const groq = createGroqClient(config.groq);
if (!groq.isConfigured) {
  console.warn('[groq] GROQ_API_KEY not set; POST /api/ai/chat returns 503');
}

// Only the AG Studio assistant can use Bedrock (AG_STUDIO_AI_PROVIDER=bedrock);
// credentials come from the AWS SDK default chain.
const bedrockStudio =
  config.agStudio.aiProvider === 'bedrock' ? createBedrockStudioClient(config.agStudio.bedrock) : null;
if (bedrockStudio) {
  console.log('[bedrock] AG Studio assistant uses', config.agStudio.bedrock.model, 'in', config.agStudio.bedrock.region);
}

const app = createApp({ db, config, paypal, groq, bedrockStudio });
app.listen(config.port, () => {
  console.log(`ReliefPay API listening on http://localhost:${config.port}`);
});
