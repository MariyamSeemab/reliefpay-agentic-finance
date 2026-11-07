// AI "suggest a split": one Groq chat completion with a strict json_schema
// output. It only proposes integer percentages across ACTIVE campaigns; the
// donor edits and approves, and no order is created here. The request carries
// only a number from the client, so there is no free text to inject.
import { HttpError } from '../errors.js';
import { MAX_DONATION, MIN_DONATION, isValidAmount } from '../services/donations.js';

export const SPLIT_SCHEMA = {
  type: 'object',
  properties: {
    allocations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { campaignId: { type: 'string' }, percent: { type: 'integer' } },
        required: ['campaignId', 'percent'],
        additionalProperties: false,
      },
    },
    rationale: { type: 'string' },
  },
  required: ['allocations', 'rationale'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = [
  'You suggest how to split one USD donation across the active relief campaigns listed by the user.',
  'Weight the split toward the least-funded campaigns, judged by the remaining amount to target and the percent funded.',
  'Use only the campaign ids given. Give every listed campaign an integer percent of at least 0; the percents must sum to exactly 100.',
  'Each campaign has precomputed fundedPercent (share of target already raised) and remaining (USD still needed).',
  'If the rationale cites numbers, quote only those fundedPercent and remaining values exactly as given; do not compute other percentages.',
  'Keep the rationale under 300 characters.',
  'You only propose a split; the donor reviews, edits and decides.',
].join(' ');

function invalid(message) {
  return new HttpError(502, 'AI_INVALID_SUGGESTION', message);
}

export async function suggestSplit({ db, groq, amount }) {
  if (!isValidAmount(amount)) {
    throw new HttpError(400, 'INVALID_AMOUNT', `Amount must be between ${MIN_DONATION} and ${MAX_DONATION} with at most 2 decimals`);
  }
  if (!groq?.isConfigured) {
    throw new HttpError(503, 'AI_NOT_CONFIGURED', 'GROQ_API_KEY is not configured on the server');
  }

  const campaigns = db
    .prepare("SELECT id, title, target_cents, raised_cents FROM campaigns WHERE status = 'ACTIVE' ORDER BY id")
    .all()
    .map((c) => ({
      id: c.id,
      title: c.title,
      target: c.target_cents / 100,
      raised: c.raised_cents / 100,
      remaining: Math.max(0, c.target_cents - c.raised_cents) / 100,
      fundedPercent: c.target_cents > 0 ? Math.round((c.raised_cents / c.target_cents) * 1000) / 10 : 0,
    }));
  if (campaigns.length < 2) {
    throw new HttpError(409, 'NOT_ENOUGH_CAMPAIGNS', 'At least two active campaigns are needed for a split');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify({ amount, currency: 'USD', campaigns }) },
  ];
  const message = await groq.complete({
    messages,
    responseFormat: { type: 'json_schema', json_schema: { name: 'split_suggestion', strict: true, schema: SPLIT_SCHEMA } },
    maxTokens: 512,
    reasoningEffort: 'low',
  });

  let parsed;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    throw invalid('The AI returned output that is not JSON');
  }
  const list = parsed?.allocations;
  if (!Array.isArray(list) || list.length === 0) throw invalid('The AI returned no allocations');

  const byId = new Map(campaigns.map((c) => [c.id, c]));
  const seen = new Set();
  let sum = 0;
  let positive = 0;
  for (const a of list) {
    if (!a || !byId.has(a.campaignId)) throw invalid('The AI used a campaign that is not active');
    if (seen.has(a.campaignId)) throw invalid('The AI listed a campaign twice');
    seen.add(a.campaignId);
    if (!Number.isInteger(a.percent) || a.percent < 0 || a.percent > 100) throw invalid('The AI returned a percent outside 0 to 100');
    sum += a.percent;
    if (a.percent > 0) positive += 1;
  }
  if (sum !== 100) throw invalid('The AI percents do not sum to 100');
  if (positive < 2) throw invalid('The AI split must include at least two campaigns');

  return {
    allocations: list.map((a) => ({ campaignId: a.campaignId, title: byId.get(a.campaignId).title, percent: a.percent })),
    rationale: String(parsed.rationale ?? '').slice(0, 500),
  };
}
