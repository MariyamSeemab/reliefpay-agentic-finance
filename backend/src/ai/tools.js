// Tool allowlist for the Groq agent. Tools read real DB data and can only
// DRAFT payout batches. There is deliberately no release tool and the tool
// context carries no PayPal client: releasing money stays behind
// releasePayoutBatch, which needs a human ADMIN and the server-side code.
import { writeAudit } from '../audit.js';
import { HttpError } from '../errors.js';
import { campaignAvailableCents, toDollars } from '../services/campaigns.js';
import { draftPayoutBatch } from '../services/payouts.js';

export const MAX_TOOL_RESULT_CHARS = 4000;
export const REJECTED_TOOL_MESSAGE = 'Tool not available. Payout release requires a human admin with the authorization code.';

const APPLICATION_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DOCUMENT_REQUESTED'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const BATCH_STATUSES = ['DRAFT', 'RELEASING', 'RELEASE_FAILED', 'PENDING', 'PROCESSING', 'SUCCESS', 'DENIED', 'CANCELED'];
const SENSITIVE_KEY = /code|secret|password|token|key/i;

const fn = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

export const TOOL_DEFINITIONS = [
  fn('get_campaigns', 'List relief campaigns with raised, disbursed and available funds in USD.'),
  fn(
    'list_applications',
    'List beneficiary aid applications, optionally filtered. Amounts are USD.',
    {
      status: { type: 'string', enum: APPLICATION_STATUSES },
      priority: { type: 'string', enum: PRIORITIES },
      campaign_id: { type: 'string', description: 'Campaign id such as cmp-01' },
      limit: { type: 'integer', minimum: 1, maximum: 25 },
    },
  ),
  fn('list_donations', 'List recent donations, newest first. Amounts are USD.', {
    campaign_id: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 20 },
  }),
  fn('list_payout_batches', 'List payout batches and their status.', {
    status: { type: 'string', enum: BATCH_STATUSES },
  }),
  fn(
    'draft_payout_batch',
    'Create a DRAFT payout batch from APPROVED applications of one campaign. This does not send money; an admin must review and release it.',
    {
      campaign_id: { type: 'string' },
      application_ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 50 },
      note: { type: 'string', description: 'Short reason for the batch' },
    },
    ['campaign_id', 'application_ids'],
  ),
];

const TOOL_NAMES = new Set(TOOL_DEFINITIONS.map((t) => t.function.name));

class ToolInputError extends Error {}

function optionalEnum(args, key, values) {
  const v = args[key];
  if (v === undefined || v === null || v === '') return undefined;
  if (!values.includes(v)) throw new ToolInputError(`${key} must be one of ${values.join(', ')}`);
  return v;
}

function optionalString(args, key) {
  const v = args[key];
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') throw new ToolInputError(`${key} must be a string`);
  return v;
}

function limitArg(args, max) {
  const v = args.limit;
  if (v === undefined || v === null) return max;
  if (!Number.isInteger(v) || v < 1) throw new ToolInputError(`limit must be an integer between 1 and ${max}`);
  return Math.min(v, max);
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? '[redacted]' : redact(v)]));
  }
  return value;
}

const handlers = {
  get_campaigns({ db }) {
    return db
      .prepare('SELECT * FROM campaigns ORDER BY id')
      .all()
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        raised: toDollars(c.raised_cents),
        disbursed: toDollars(c.disbursed_cents),
        available: toDollars(campaignAvailableCents(db, c.id)),
        target: toDollars(c.target_cents),
        currency: c.currency,
      }));
  },

  list_applications({ db }, args) {
    const filters = [
      ['status', optionalEnum(args, 'status', APPLICATION_STATUSES)],
      ['priority', optionalEnum(args, 'priority', PRIORITIES)],
      ['campaign_id', optionalString(args, 'campaign_id')],
    ].filter(([, v]) => v !== undefined);
    const where = filters.length ? 'WHERE ' + filters.map(([col]) => `${col} = ?`).join(' AND ') : '';
    return db
      .prepare(`SELECT * FROM applications ${where} ORDER BY id LIMIT ?`)
      .all(...filters.map(([, v]) => v), limitArg(args, 25))
      .map((a) => ({
        id: a.id,
        name: a.beneficiary_name,
        campaign_id: a.campaign_id,
        status: a.status,
        priority: a.priority,
        requested: toDollars(a.requested_cents),
        approved: toDollars(a.approved_cents),
        area: a.area,
      }));
  },

  list_donations({ db }, args) {
    const campaignId = optionalString(args, 'campaign_id');
    const where = campaignId ? 'WHERE campaign_id = ?' : '';
    const params = campaignId ? [campaignId] : [];
    return db
      .prepare(`SELECT * FROM donations ${where} ORDER BY created_at DESC, rowid DESC LIMIT ?`)
      .all(...params, limitArg(args, 20))
      .map((d) => ({
        id: d.id,
        campaign_id: d.campaign_id,
        donor: d.donor_name,
        amount: toDollars(d.amount_cents),
        status: d.status,
        created_at: d.created_at,
      }));
  },

  list_payout_batches({ db }, args) {
    const status = optionalEnum(args, 'status', BATCH_STATUSES);
    const where = status ? 'WHERE pb.status = ?' : '';
    return db
      .prepare(
        `SELECT pb.*, (SELECT COUNT(*) FROM payout_items pi WHERE pi.batch_id = pb.id) AS item_count
           FROM payout_batches pb ${where} ORDER BY pb.created_at DESC, pb.rowid DESC`,
      )
      .all(...(status ? [status] : []))
      .map((b) => ({
        id: b.id,
        campaign_id: b.campaign_id,
        status: b.status,
        total: toDollars(b.total_cents),
        items: b.item_count,
        drafted_by_ai: Boolean(b.drafted_by_ai),
      }));
  },

  draft_payout_batch({ db, config, user }, args) {
    const campaignId = optionalString(args, 'campaign_id');
    if (!campaignId) throw new ToolInputError('campaign_id is required');
    const applicationIds = args.application_ids;
    if (!Array.isArray(applicationIds)) throw new ToolInputError('application_ids must be an array of strings');
    const note = optionalString(args, 'note');
    const batch = draftPayoutBatch(db, config, {
      actor: agentActor(config, user),
      userId: user.id,
      campaignId,
      applicationIds,
      note,
      draftedByAi: true,
    });
    return {
      batch_id: batch.id,
      status: 'DRAFT',
      total: batch.totalAmount,
      currency: batch.currency,
      item_count: batch.beneficiaryCount,
      next_step: 'An admin must review it in Payment Agent and enter the authorization code to release.',
    };
  },
};

export function agentActor(config, user) {
  return { id: user.id, label: `AI agent (Groq ${config.groq.model}) for ${user.name}` };
}

function serialize(result) {
  const text = JSON.stringify(result);
  return text.length > MAX_TOOL_RESULT_CHARS ? text.slice(0, MAX_TOOL_RESULT_CHARS) + '...(truncated)' : text;
}

// Returns { ok, result, content } where content is the serialized (and
// truncated) result sent back to the model as the tool message.
export function executeTool(name, rawArgs, ctx) {
  const { db, config, user } = ctx;
  const actor = agentActor(config, user);
  const toolName = String(name ?? '').slice(0, 100);

  if (!TOOL_NAMES.has(toolName)) {
    writeAudit(db, {
      actor,
      action: 'AI_TOOL_REJECTED',
      target: `AI tool ${toolName}`,
      status: 'REJECTED',
      details: { tool: toolName, args: redactRaw(rawArgs) },
    });
    const result = { error: REJECTED_TOOL_MESSAGE };
    return { ok: false, result, content: serialize(result) };
  }

  let args;
  let result;
  let ok = false;
  try {
    args = parseArgs(rawArgs);
    result = handlers[toolName](ctx, args);
    ok = true;
  } catch (err) {
    if (err instanceof ToolInputError) result = { error: err.message };
    else if (err instanceof HttpError) result = { error: `${err.code}: ${err.message}`, ...err.extra };
    else throw err;
  }

  writeAudit(db, {
    actor,
    action: 'AI_TOOL_CALL',
    target: `AI tool ${toolName}`,
    status: ok ? 'RECORDED' : 'FAILED',
    details: { tool: toolName, args: args === undefined ? redactRaw(rawArgs) : redact(args), ...(ok ? {} : { error: result.error }) },
  });
  return { ok, result, content: serialize(result) };
}

function parseArgs(rawArgs) {
  if (rawArgs === undefined || rawArgs === null || rawArgs === '') return {};
  let parsed = rawArgs;
  if (typeof rawArgs === 'string') {
    try {
      parsed = JSON.parse(rawArgs);
    } catch {
      throw new ToolInputError('Arguments must be valid JSON');
    }
  }
  if (parsed === null) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new ToolInputError('Arguments must be a JSON object');
  return parsed;
}

function redactRaw(rawArgs) {
  try {
    return redact(parseArgs(rawArgs));
  } catch {
    return '[unparseable]';
  }
}
