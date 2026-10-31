// Bounded tool loop for the ReliefPay operations assistant. The agent gets
// db/config/user only (no PayPal client), so it can read data and draft
// payout batches but has no code path that releases money.
import { executeTool, TOOL_DEFINITIONS } from './tools.js';

export const SYSTEM_PROMPT = [
  "You are ReliefPay's operations assistant for disaster relief administrators.",
  'All amounts are in USD.',
  'Use the tools to read campaigns, applications, donations and payout batches. Never invent data; if a tool does not return it, say you do not know.',
  'You may draft payout batches only from APPROVED applications of a single campaign.',
  'You cannot release or send money. A human admin must review the draft and authorize the release in the Payment Agent page.',
  'Keep answers short.',
].join(' ');

const STEP_LIMIT_REPLY =
  'I reached the step limit for this request before finishing. Please narrow the request or ask again.';

function summarize(name, exec) {
  if (!exec.ok) return exec.result.error;
  const r = exec.result;
  if (Array.isArray(r)) return `${r.length} row(s)`;
  if (name === 'draft_payout_batch') return `Drafted ${r.batch_id} (${r.item_count} item(s), ${r.total} ${r.currency})`;
  return 'ok';
}

function parseForStep(raw) {
  if (typeof raw !== 'string') return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function runAgent({ db, config, groq, user, messages, maxSteps = 6 }) {
  const convo = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
  const steps = [];
  const draftedBatches = [];
  const ctx = { db, config, user };

  for (let i = 0; i < maxSteps; i += 1) {
    const msg = await groq.chat({ messages: convo, tools: TOOL_DEFINITIONS });
    if (!msg.tool_calls?.length) {
      return { reply: msg.content ?? '', steps, draftedBatches };
    }

    // Echo only the fields the API accepts (no `name`, no `reasoning`).
    const toolCalls = msg.tool_calls.map((c) => ({
      id: c.id,
      type: 'function',
      function: { name: c.function?.name, arguments: c.function?.arguments ?? '{}' },
    }));
    convo.push({ role: 'assistant', content: msg.content ?? '', tool_calls: toolCalls });

    for (const call of toolCalls) {
      const exec = executeTool(call.function.name, call.function.arguments, ctx);
      convo.push({ role: 'tool', tool_call_id: call.id, content: exec.content });
      steps.push({
        tool: call.function.name,
        args: parseForStep(call.function.arguments),
        ok: exec.ok,
        summary: summarize(call.function.name, exec),
      });
      if (exec.ok && call.function.name === 'draft_payout_batch') {
        draftedBatches.push({
          id: exec.result.batch_id,
          total: exec.result.total,
          currency: exec.result.currency,
          itemCount: exec.result.item_count,
        });
      }
    }
  }

  return { reply: STEP_LIMIT_REPLY, steps, draftedBatches };
}
