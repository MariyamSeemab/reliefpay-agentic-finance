// Amazon Bedrock (Converse API) backend for the AG Studio assistant proxy,
// used when AG_STUDIO_AI_PROVIDER=bedrock. The browser adapter
// (src/components/analytics/studio/openaiAdapter.ts) speaks the OpenAI
// Responses API, so this module translates its request body to a
// ConverseStream request and the ConverseStream events back to Responses SSE
// events. Credentials come from the AWS SDK default chain (on Render:
// AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) and never leave the server.

import crypto from 'node:crypto';
import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

export class StudioTranslationError extends Error {}

// `client` lets tests pass a fake with an async send(command) method.
export function createBedrockStudioClient({ region, model, client }) {
  const runtime = client ?? new BedrockRuntimeClient({ region });
  return {
    model,
    converseStream: (input, { signal } = {}) => runtime.send(new ConverseStreamCommand(input), { abortSignal: signal }),
  };
}

// ---------------------------------------------------------------------------
// Request: Responses API body -> ConverseStream input
// ---------------------------------------------------------------------------

function partsToText(content) {
  if (typeof content === 'string') return content ? [content] : [];
  if (!Array.isArray(content)) return [];
  const texts = [];
  for (const part of content) {
    if (typeof part === 'string') texts.push(part);
    else if (typeof part?.text === 'string') texts.push(part.text);
    else if (typeof part?.refusal === 'string') texts.push(part.refusal);
    // Images and files are not used by the analytics assistant; they are dropped.
  }
  return texts.filter((t) => t !== '');
}

function parseArguments(args) {
  if (args && typeof args === 'object') return args;
  if (typeof args !== 'string' || args.trim() === '') return {};
  try {
    const parsed = JSON.parse(args);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toolChoiceFor(choice) {
  if (choice === 'required') return { any: {} };
  if (choice && typeof choice === 'object' && typeof choice.name === 'string') return { tool: { name: choice.name } };
  if (choice === 'none') return undefined;
  return { auto: {} };
}

function jsonFormatInstruction(format) {
  return (
    'Reply with only one JSON value, no prose and no code fences, that matches this JSON schema' +
    (format.name ? ` ("${format.name}")` : '') +
    `:\n${JSON.stringify(format.schema ?? {})}`
  );
}

// AG Studio tool schemas use `$defs` + `$ref` (some recursive). With them, Nova
// 2 Lite answered in plain text instead of calling tools, even with toolChoice
// set (seen live); with the refs inlined it calls tools. Refs are inlined one
// level deep (two levels made the query tool schema ~180 kB, full inlining
// ~330 kB). A deeper ref used to become {} (any value): Nova then sent strings
// where AG Studio wanted objects, and its data agent showed "Could not run the
// query: Expected an object" several times per question (seen live). A deeper
// ref now becomes a small typed stub that keeps the JSON type and, for string
// fields, the allowed values (the dataset's field ids), so the shape is right.
const REF_DEPTH = 1;
const MAX_STUB_ENUM = 60;

function refName(ref) {
  return ref.replace(/^#\/\$defs\//, '');
}

// Collects the JSON types (and string enum values) a definition can take,
// following refs without recursing forever.
function typedStub(def, defs, name) {
  const types = new Set();
  const values = [];
  const visit = (node, seen) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.$ref === 'string') {
      const n = refName(node.$ref);
      if (seen.has(n)) {
        types.add('object');
        return;
      }
      visit(defs[n], new Set([...seen, n]));
      return;
    }
    if (node.type) [].concat(node.type).forEach((t) => types.add(t));
    else if (node.properties || node.required) types.add('object');
    if (Array.isArray(node.enum)) values.push(...node.enum);
    if (node.const !== undefined) values.push(node.const);
    for (const key of ['anyOf', 'oneOf', 'allOf']) (node[key] || []).forEach((x) => visit(x, seen));
  };
  visit(def, new Set([name]));
  const list = [...types];
  const stub = { type: list.length === 1 ? list[0] : list.length ? list : 'object' };
  const unique = [...new Set(values)];
  if (unique.length && unique.length <= MAX_STUB_ENUM && list.length === 1 && list[0] === 'string') stub.enum = unique;
  if (stub.type === 'object') stub.description = `A ${name} object (same shape as the ${name} used above).`;
  return stub;
}

export function inlineRefs(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const defs = schema.$defs && typeof schema.$defs === 'object' ? schema.$defs : {};
  function walk(node, depth) {
    if (Array.isArray(node)) return node.map((v) => walk(v, depth));
    if (!node || typeof node !== 'object') return node;
    if (typeof node.$ref === 'string') {
      const name = refName(node.$ref);
      const def = defs[name];
      if (!def) return { type: 'object' };
      return depth < REF_DEPTH ? walk(def, depth + 1) : typedStub(def, defs, name);
    }
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (key !== '$defs') out[key] = walk(value, depth);
    }
    return out;
  }
  return walk(schema, 0);
}

export function toConverseInput(body, { model, maxTokens }) {
  const system = [];
  if (typeof body.instructions === 'string' && body.instructions.trim() !== '') system.push({ text: body.instructions });

  const messages = [];
  const push = (role, block) => {
    const last = messages[messages.length - 1];
    // Converse needs alternating roles, so consecutive same-role items merge.
    if (last?.role === role) last.content.push(block);
    else messages.push({ role, content: [block] });
  };

  for (const item of body.input) {
    if (!item || typeof item !== 'object') throw new StudioTranslationError('Each input item must be an object');
    const type = item.type ?? 'message';
    if (type === 'message') {
      const texts = partsToText(item.content);
      if (item.role === 'system' || item.role === 'developer') {
        for (const text of texts) system.push({ text });
      } else if (item.role === 'user' || item.role === 'assistant') {
        for (const text of texts) push(item.role, { text });
      } else {
        throw new StudioTranslationError(`Unsupported message role "${item.role}"`);
      }
    } else if (type === 'function_call') {
      push('assistant', { toolUse: { toolUseId: String(item.call_id), name: String(item.name), input: parseArguments(item.arguments) } });
    } else if (type === 'function_call_output') {
      const output = typeof item.output === 'string' ? item.output : JSON.stringify(item.output ?? '');
      push('user', { toolResult: { toolUseId: String(item.call_id), content: [{ text: output || '(empty)' }] } });
    } else if (type === 'reasoning') {
      // Reasoning is not enabled for Bedrock, so earlier reasoning items are not replayed.
    } else {
      throw new StudioTranslationError(`Unsupported input item type "${type}"`);
    }
  }
  if (messages.length === 0 || messages[0].role !== 'user') {
    throw new StudioTranslationError('The conversation must start with a user message');
  }
  // The Responses API treats a trailing assistant message as history, while
  // Converse treats it as a prefill to continue (and Nova rejects prefill with
  // toolChoice any/tool), so a short user turn asks for the next reply.
  if (messages[messages.length - 1].role === 'assistant') push('user', { text: 'Continue.' });

  const format = body.text?.format;
  const jsonMode = format?.type === 'json_schema';
  if (jsonMode) system.push({ text: jsonFormatInstruction(format) });

  const inferenceConfig = { maxTokens };
  if (typeof body.temperature === 'number') inferenceConfig.temperature = body.temperature;
  if (typeof body.top_p === 'number') inferenceConfig.topP = body.top_p;

  // Low-effort reasoning: without it Nova 2 Lite kept re-running queries in the
  // AG Studio data agent and never called complete_task (seen live); medium
  // effort used the whole output budget on reasoning. Reasoning text is not
  // forwarded to the browser.
  const input = {
    modelId: model,
    messages,
    inferenceConfig,
    additionalModelRequestFields: { reasoningConfig: { type: 'enabled', maxReasoningEffort: 'low' } },
  };
  if (system.length > 0) input.system = system;

  const tools = Array.isArray(body.tools) ? body.tools.filter((t) => t?.type === 'function' && typeof t.name === 'string') : [];
  if (tools.length > 0) {
    input.toolConfig = {
      tools: tools.map((t) => ({
        toolSpec: {
          name: t.name,
          ...(typeof t.description === 'string' && t.description !== '' && { description: t.description }),
          inputSchema: { json: inlineRefs(t.parameters ?? { type: 'object', properties: {} }) },
        },
      })),
    };
    const toolChoice = toolChoiceFor(body.tool_choice);
    if (toolChoice) input.toolConfig.toolChoice = toolChoice;
  }
  return { input, jsonMode };
}

// ---------------------------------------------------------------------------
// Response: ConverseStream events -> Responses API SSE events
// ---------------------------------------------------------------------------

const STREAM_ERRORS = {
  throttlingException: ['rate_limit_exceeded', 'Bedrock rate limit reached; try again shortly'],
  validationException: ['invalid_request', 'The AI service rejected the request'],
  modelStreamErrorException: ['api_error', 'The AI service stream failed'],
  internalServerException: ['api_error', 'The AI service request failed'],
  serviceUnavailableException: ['api_error', 'The AI service is unavailable; try again shortly'],
};

function stripCodeFence(text) {
  const match = /^\s*```[a-zA-Z]*\s*\n([\s\S]*?)\n?```\s*$/.exec(text);
  return match ? match[1] : text;
}

// Yields Responses API event objects (the adapter reads `type` from each SSE
// data payload). Errors from the SDK stream become one `error` event.
export async function* toResponsesEvents(stream, { model, jsonMode = false, newId = () => crypto.randomUUID().replace(/-/g, '') }) {
  const responseId = `resp_${newId()}`;
  const createdAt = Math.floor(Date.now() / 1000);
  const output = [];
  const blocks = new Map(); // contentBlockIndex -> { item, outputIndex }
  let usage;
  let stopReason;

  const base = (status) => ({ id: responseId, object: 'response', created_at: createdAt, model, status });
  yield { type: 'response.created', response: { ...base('in_progress'), output: [] } };

  function* open(index, item) {
    const outputIndex = output.length;
    output.push(item);
    blocks.set(index, { item, outputIndex });
    yield { type: 'response.output_item.added', output_index: outputIndex, item: { ...item } };
  }

  function* close(index) {
    const block = blocks.get(index);
    if (!block) return;
    blocks.delete(index);
    const { item, outputIndex } = block;
    item.status = 'completed';
    if (item.type === 'function_call' && item.arguments.trim() === '') item.arguments = '{}';
    if (item.type === 'message' && jsonMode) item.content[0].text = stripCodeFence(item.content[0].text);
    yield { type: 'response.output_item.done', output_index: outputIndex, item };
  }

  try {
    for await (const event of stream) {
      if (event.contentBlockStart) {
        const { contentBlockIndex: index, start } = event.contentBlockStart;
        if (start?.toolUse) {
          yield* open(index, {
            id: `fc_${newId()}`,
            type: 'function_call',
            status: 'in_progress',
            call_id: start.toolUse.toolUseId,
            name: start.toolUse.name,
            arguments: '',
          });
        }
      } else if (event.contentBlockDelta) {
        const { contentBlockIndex: index, delta } = event.contentBlockDelta;
        if (typeof delta?.text === 'string') {
          if (!blocks.has(index)) {
            yield* open(index, {
              id: `msg_${newId()}`,
              type: 'message',
              role: 'assistant',
              status: 'in_progress',
              content: [{ type: 'output_text', text: '', annotations: [] }],
            });
          }
          const { item, outputIndex } = blocks.get(index);
          if (item.type !== 'message') continue;
          item.content[0].text += delta.text;
          yield { type: 'response.output_text.delta', item_id: item.id, output_index: outputIndex, content_index: 0, delta: delta.text };
        } else if (typeof delta?.toolUse?.input === 'string') {
          const block = blocks.get(index);
          if (block?.item.type !== 'function_call') continue;
          block.item.arguments += delta.toolUse.input;
          yield {
            type: 'response.function_call_arguments.delta',
            item_id: block.item.id,
            output_index: block.outputIndex,
            delta: delta.toolUse.input,
          };
        }
        // reasoningContent and other deltas are not forwarded (reasoning is off).
      } else if (event.contentBlockStop) {
        yield* close(event.contentBlockStop.contentBlockIndex);
      } else if (event.messageStop) {
        stopReason = event.messageStop.stopReason;
      } else if (event.metadata?.usage) {
        usage = event.metadata.usage;
      } else {
        const name = Object.keys(STREAM_ERRORS).find((key) => event[key]);
        if (name) {
          const [code, message] = STREAM_ERRORS[name];
          yield { type: 'error', code, message };
          return;
        }
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
    console.error('[bedrock studio] stream error', err?.name);
    // SDK exception names (ThrottlingException) are the event keys with a capital first letter.
    const name = String(err?.name ?? '');
    const [code, message] = STREAM_ERRORS[name.charAt(0).toLowerCase() + name.slice(1)] ?? STREAM_ERRORS.internalServerException;
    yield { type: 'error', code, message };
    return;
  }

  for (const index of [...blocks.keys()]) yield* close(index);

  const response = {
    ...base('completed'),
    output,
    usage: usage
      ? { input_tokens: usage.inputTokens ?? 0, output_tokens: usage.outputTokens ?? 0, total_tokens: usage.totalTokens ?? 0 }
      : undefined,
  };
  if (stopReason === 'max_tokens') {
    yield {
      type: 'response.incomplete',
      response: { ...response, status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, error: { message: 'The reply reached the output token limit' } },
    };
    return;
  }
  yield { type: 'response.completed', response };
}

// Maps an error thrown by ConverseStream before streaming starts to an HTTP
// status and a message that is safe to show (AWS messages can include ARNs).
export function bedrockErrorResponse(err) {
  switch (err?.name) {
    case 'ThrottlingException':
    case 'ServiceQuotaExceededException':
      return [429, 'Bedrock rate limit reached; try again shortly'];
    case 'ValidationException':
      return [400, 'The AI service rejected the request'];
    case 'AccessDeniedException':
    case 'UnrecognizedClientException':
    case 'CredentialsProviderError':
      return [502, 'The AI service credentials are not valid on the server'];
    case 'ServiceUnavailableException':
      return [503, 'The AI service is unavailable; try again shortly'];
    default:
      return [502, 'The AI service request failed'];
  }
}
