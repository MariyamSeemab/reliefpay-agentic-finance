import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const backendRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function readConfig(env = process.env) {
  const nodeEnv = nonEmpty(env.NODE_ENV) || 'development';

  let jwtSecret = nonEmpty(env.JWT_SECRET);
  if (!jwtSecret) {
    if (nodeEnv === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    jwtSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[config] JWT_SECRET not set; using a random secret (tokens reset on restart)');
  }

  const databasePath = nonEmpty(env.DATABASE_PATH) || path.resolve(backendRoot, 'data', 'reliefpay.db');
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
  }

  const portRaw = Number.parseInt(env.PORT ?? '', 10);

  return {
    port: Number.isFinite(portRaw) ? portRaw : 4000,
    nodeEnv,
    jwtSecret,
    jwtExpiresIn: '8h',
    databasePath,
    staticDir: nonEmpty(env.STATIC_DIR) || path.resolve(backendRoot, '..', 'dist'),
    paypal: {
      clientId: nonEmpty(env.PAYPAL_CLIENT_ID),
      clientSecret: nonEmpty(env.PAYPAL_CLIENT_SECRET),
      apiBase: nonEmpty(env.PAYPAL_API_BASE) || 'https://api-m.sandbox.paypal.com',
      webhookId: nonEmpty(env.PAYPAL_WEBHOOK_ID),
      currency: nonEmpty(env.PAYPAL_CURRENCY) || 'USD',
    },
    payoutAuthCode: nonEmpty(env.PAYOUT_AUTH_CODE),
    payoutReceiverEmail: nonEmpty(env.PAYOUT_RECEIVER_EMAIL),
    groq: {
      apiKey: nonEmpty(env.GROQ_API_KEY),
      baseUrl: nonEmpty(env.GROQ_BASE_URL) || 'https://api.groq.com/openai/v1',
      model: nonEmpty(env.GROQ_MODEL) || 'openai/gpt-oss-120b',
    },
    agStudio: {
      licenseKey: nonEmpty(env.AG_STUDIO_LICENSE),
      // Off unless AG_STUDIO_AI=on: one AG Studio turn sends ~5.4k input tokens, so on
      // Groq's on_demand tier (8,000 TPM for openai/gpt-oss-120b) the second turn of a
      // chat gets HTTP 429 before a reply arrives. Enable it on a tier with more TPM.
      aiEnabled: nonEmpty(env.AG_STUDIO_AI)?.toLowerCase() === 'on',
      // groq (default) or bedrock. Only the AG Studio assistant uses this; the AI
      // Command Centre and split suggestions always use Groq.
      aiProvider: nonEmpty(env.AG_STUDIO_AI_PROVIDER)?.toLowerCase() === 'bedrock' ? 'bedrock' : 'groq',
      bedrock: {
        model: nonEmpty(env.AG_STUDIO_BEDROCK_MODEL) || 'us.amazon.nova-2-lite-v1:0',
        region: nonEmpty(env.AWS_REGION) || 'us-east-1',
      },
    },
  };
}
