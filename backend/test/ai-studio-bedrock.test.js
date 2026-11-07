import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import { readConfig } from '../src/config.js';
import { loginAs, makeTestContext } from './helpers.js';

const ADMIN = 'alok.v@reliefpay.org';
const AUDITOR = 'elena@auditcore.org';
const DONOR = 'mehta.r@techcorp.in';
const MODEL = 'us.amazon.nova-2-lite-v1:0';
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

async function* events(list) {
  for (const e of list) yield e;
}

const TEXT_STREAM = [
  { messageStart: { role: 'assistant' } },
  { contentBlockDelta: { contentBlockIndex: 0, delta: { text: 'Hello ' } } },
  { contentBlockDelta: { contentBlockIndex: 0, delta: { text: 'there' } } },
  { contentBlockStop: { contentBlockIndex: 0 } },
  { messageStop: { stopReason: 'end_turn' } },
  { metadata: { usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 } } },
];

const TOOL_STREAM = [
  { messageStart: { role: 'assistant' } },
  { contentBlockDelta: { contentBlockIndex: 0, delta: { text: 'Adding it.' } } },
  { contentBlockStop: { contentBlockIndex: 0 } },
  { contentBlockStart: { contentBlockIndex: 1, start: { toolUse: { toolUseId: 'tooluse_abc', name: 'add_widget' } } } },
  { contentBlockDelta: { contentBlockIndex: 1, delta: { toolUse: { input: '{"id":' } } } },
  { contentBlockDelta: { contentBlockIndex: 1, delta: { toolUse: { input: '"w1"}' } } } },
  { contentBlockStop: { contentBlockIndex: 1 } },
  { messageStop: { stopReason: 'tool_use' } },
  { metadata: { usage: { inputTokens: 20, outputTokens: 5, totalTokens: 25 } } },
];

// Fake Bedrock Runtime client: records each command input; state.error makes
// send() throw, state.stream picks the event list.
function makeFakeBedrock() {
  const inputs = [];
  const state = { stream: TEXT_STREAM };
  return {
    inputs,
    state,
    client: {
      async send(command) {
        inputs.push(command.input);
        if (state.error) throw state.error;
        return { $metadata: { httpStatusCode: 200 }, stream: events(state.stream) };
      },
    },
  };
}

async function setup(configOverrides = {}) {
  const bedrock = makeFakeBedrock();
  const ctx = makeTestContext({
    configOverrides: { AG_STUDIO_AI: 'on', AG_STUDIO_AI_PROVIDER: 'bedrock', ...configOverrides },
    bedrockClient: bedrock.client,
  });
  const admin = await loginAs(ctx.app, ADMIN);
  return { ctx, bedrock, admin };
}

const TOOL = {
  type: 'function',
  name: 'add_widget',
  description: 'Add a widget',
  strict: true,
  parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
};

const turn = (extra = {}) => ({
  model: MODEL,
  input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Summarise this page' }] }],
  instructions: 'You are the AG Studio assistant.',
  tools: [TOOL],
  tool_choice: 'auto',
  text: { format: { type: 'text' } },
  reasoning: { effort: 'medium' },
  parallel_tool_calls: true,
  stream: true,
  ...extra,
});

const post = (ctx, token, body) => {
  const req = request(ctx.app).post('/api/ai/studio/responses');
  if (token) req.set(bearer(token));
  return req.send(body);
};

function parseSse(text) {
  return text
    .split('\n\n')
    .flatMap((frame) => frame.split('\n'))
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)));
}

describe('AG Studio assistant via Bedrock', () => {
  test('provider defaults to groq; bedrock settings have defaults', () => {
    const config = readConfig({ JWT_SECRET: 'x', DATABASE_PATH: ':memory:' });
    assert.equal(config.agStudio.aiProvider, 'groq');
    assert.equal(config.agStudio.bedrock.model, MODEL);
    assert.equal(config.agStudio.bedrock.region, 'us-east-1');
    assert.equal(readConfig({ JWT_SECRET: 'x', DATABASE_PATH: ':memory:', AG_STUDIO_AI_PROVIDER: 'other' }).agStudio.aiProvider, 'groq');
    assert.equal(readConfig({ JWT_SECRET: 'x', DATABASE_PATH: ':memory:', AG_STUDIO_AI_PROVIDER: 'Bedrock' }).agStudio.aiProvider, 'bedrock');
  });

  test('with the default provider the proxy still calls Groq, not Bedrock', async () => {
    const bedrock = makeFakeBedrock();
    const groqRequests = [];
    const ctx = makeTestContext({
      configOverrides: { AG_STUDIO_AI: 'on' },
      bedrockClient: bedrock.client,
      groqFetch: async (url, init) => {
        groqRequests.push(JSON.parse(init.body));
        return new Response('data: {"type":"response.completed"}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
      },
    });
    assert.equal(ctx.bedrockStudio, null);
    const admin = await loginAs(ctx.app, ADMIN);
    const res = await post(ctx, admin, turn({ model: 'openai/gpt-oss-120b' }));
    assert.equal(res.status, 200);
    assert.equal(groqRequests.length, 1);
    assert.equal(bedrock.inputs.length, 0);
  });

  test('translates the Responses body to a ConverseStream request', async () => {
    const { ctx, bedrock, admin } = await setup();
    const res = await post(ctx, admin, turn({
      temperature: 0.3,
      max_output_tokens: 99999,
      input: [
        { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Add a widget' }] },
        { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Sure.', annotations: [] }] },
        { type: 'function_call', call_id: 'tooluse_1', name: 'add_widget', arguments: '{"id":"w1"}' },
        { type: 'function_call_output', call_id: 'tooluse_1', output: '{"ok":true}' },
        { type: 'reasoning', id: 'rs_1', summary: [] },
        { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Thanks' }] },
      ],
    }));
    assert.equal(res.status, 200);
    assert.equal(bedrock.inputs.length, 1);
    const [input] = bedrock.inputs;
    assert.equal(input.modelId, MODEL);
    assert.deepEqual(input.system, [{ text: 'You are the AG Studio assistant.' }]);
    assert.deepEqual(input.inferenceConfig, { maxTokens: 8192, temperature: 0.3 });
    assert.deepEqual(input.messages, [
      { role: 'user', content: [{ text: 'Add a widget' }] },
      {
        role: 'assistant',
        content: [{ text: 'Sure.' }, { toolUse: { toolUseId: 'tooluse_1', name: 'add_widget', input: { id: 'w1' } } }],
      },
      { role: 'user', content: [{ toolResult: { toolUseId: 'tooluse_1', content: [{ text: '{"ok":true}' }] } }, { text: 'Thanks' }] },
    ]);
    assert.deepEqual(input.toolConfig, {
      tools: [{ toolSpec: { name: 'add_widget', description: 'Add a widget', inputSchema: { json: TOOL.parameters } } }],
      toolChoice: { auto: {} },
    });
    assert.deepEqual(input.additionalModelRequestFields, { reasoningConfig: { type: 'enabled', maxReasoningEffort: 'low' } });
  });

  test('tool schema $refs are inlined one level deep; deeper and recursive refs become {}', async () => {
    const { ctx, bedrock, admin } = await setup();
    const parameters = {
      type: 'object',
      properties: { field: { $ref: '#/$defs/Field' }, group: { $ref: '#/$defs/Group' } },
      required: ['field', 'group'],
      additionalProperties: false,
      $defs: {
        Field: { type: 'object', properties: { id: { type: 'string', enum: ['a', 'b'] } }, required: ['id'] },
        Group: { type: 'object', properties: { inner: { $ref: '#/$defs/Group' } } },
      },
    };
    await post(ctx, admin, turn({ tools: [{ ...TOOL, parameters }] }));
    assert.deepEqual(bedrock.inputs[0].toolConfig.tools[0].toolSpec.inputSchema.json, {
      type: 'object',
      properties: {
        field: { type: 'object', properties: { id: { type: 'string', enum: ['a', 'b'] } }, required: ['id'] },
        group: { type: 'object', properties: { inner: {} } },
      },
      required: ['field', 'group'],
      additionalProperties: false,
    });
  });

  test('a conversation ending with an assistant message gets a user turn (no Converse prefill)', async () => {
    const { ctx, bedrock, admin } = await setup();
    const res = await post(ctx, admin, turn({
      tool_choice: 'required',
      input: [
        { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Delegate this' }] },
        { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Delegating.', annotations: [] }] },
      ],
    }));
    assert.equal(res.status, 200);
    assert.deepEqual(bedrock.inputs[0].messages.at(-1), { role: 'user', content: [{ text: 'Continue.' }] });
  });

  test('tool_choice and json_schema format map to Converse equivalents', async () => {
    const { ctx, bedrock, admin } = await setup();
    const schema = { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false };
    await post(ctx, admin, turn({ tool_choice: 'required' }));
    await post(ctx, admin, turn({ tool_choice: { type: 'function', name: 'add_widget' } }));
    await post(ctx, admin, turn({ tool_choice: 'none', text: { format: { type: 'json_schema', name: 'title', schema } } }));
    assert.deepEqual(bedrock.inputs[0].toolConfig.toolChoice, { any: {} });
    assert.deepEqual(bedrock.inputs[1].toolConfig.toolChoice, { tool: { name: 'add_widget' } });
    assert.ok(!('toolChoice' in bedrock.inputs[2].toolConfig));
    assert.equal(bedrock.inputs[2].system.length, 2);
    assert.ok(bedrock.inputs[2].system[1].text.includes(JSON.stringify(schema)));
  });

  test('streams text as Responses SSE events ending in response.completed', async () => {
    const { ctx, admin } = await setup();
    const res = await post(ctx, admin, turn());
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /^text\/event-stream/);
    assert.equal(res.headers['cache-control'], 'no-store');
    const sse = parseSse(res.text);
    assert.deepEqual(sse.map((e) => e.type), [
      'response.created',
      'response.output_item.added',
      'response.output_text.delta',
      'response.output_text.delta',
      'response.output_item.done',
      'response.completed',
    ]);
    const added = sse[1].item;
    assert.equal(added.type, 'message');
    assert.equal(sse[2].item_id, added.id);
    assert.equal(sse[2].delta + sse[3].delta, 'Hello there');
    assert.equal(sse[4].item.id, added.id);
    const done = sse[5].response;
    assert.equal(done.status, 'completed');
    assert.equal(done.model, MODEL);
    assert.match(done.id, /^resp_/);
    assert.deepEqual(done.output, [
      { id: added.id, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Hello there', annotations: [] }] },
    ]);
    assert.deepEqual(done.usage, { input_tokens: 10, output_tokens: 2, total_tokens: 12 });
  });

  test('streams a tool call as function_call events with call_id = toolUseId', async () => {
    const { ctx, bedrock, admin } = await setup();
    bedrock.state.stream = TOOL_STREAM;
    const sse = parseSse((await post(ctx, admin, turn())).text);
    const fcAdded = sse.find((e) => e.type === 'response.output_item.added' && e.item.type === 'function_call');
    assert.equal(fcAdded.item.call_id, 'tooluse_abc');
    assert.equal(fcAdded.item.name, 'add_widget');
    const argDeltas = sse.filter((e) => e.type === 'response.function_call_arguments.delta');
    assert.ok(argDeltas.every((e) => e.item_id === fcAdded.item.id));
    assert.equal(argDeltas.map((e) => e.delta).join(''), '{"id":"w1"}');
    const done = sse.at(-1);
    assert.equal(done.type, 'response.completed');
    assert.deepEqual(done.response.output[1], {
      id: fcAdded.item.id,
      type: 'function_call',
      status: 'completed',
      call_id: 'tooluse_abc',
      name: 'add_widget',
      arguments: '{"id":"w1"}',
    });
  });

  test('max_tokens stop -> response.incomplete; stream exception -> error event', async () => {
    const { ctx, bedrock, admin } = await setup();
    bedrock.state.stream = [TEXT_STREAM[1], TEXT_STREAM[3], { messageStop: { stopReason: 'max_tokens' } }];
    let sse = parseSse((await post(ctx, admin, turn())).text);
    assert.equal(sse.at(-1).type, 'response.incomplete');

    bedrock.state.stream = [TEXT_STREAM[1], { throttlingException: { message: 'arn:aws:iam::000000000000:user/x' } }];
    const res = await post(ctx, admin, turn());
    sse = parseSse(res.text);
    assert.deepEqual(sse.at(-1), { type: 'error', code: 'rate_limit_exceeded', message: 'Bedrock rate limit reached; try again shortly' });
    assert.ok(!res.text.includes('arn:aws'));
  });

  test('Bedrock errors before streaming map to safe statuses', async () => {
    const { ctx, bedrock, admin } = await setup();
    const fail = (name) => Object.assign(new Error('User: arn:aws:iam::000000000000:user/x is not authorized'), { name });
    for (const [name, status] of [['ThrottlingException', 429], ['ValidationException', 400], ['AccessDeniedException', 502], ['Boom', 502]]) {
      bedrock.state.error = fail(name);
      const res = await post(ctx, admin, turn());
      assert.equal(res.status, status, name);
      assert.equal(typeof res.body.error.message, 'string');
      assert.ok(!res.text.includes('arn:aws'), name);
    }
  });

  test('model allow-list, input validation and translation errors -> 400 without a Bedrock call', async () => {
    const { ctx, bedrock, admin } = await setup();
    assert.equal((await post(ctx, admin, turn({ model: 'openai/gpt-oss-120b' }))).status, 400);
    const noInput = turn();
    delete noInput.input;
    assert.equal((await post(ctx, admin, noInput)).status, 400);
    const res = await post(ctx, admin, turn({ input: [{ type: 'message', role: 'assistant', content: 'hi' }] }));
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error.message, 'string');
    assert.equal(bedrock.inputs.length, 0);
  });

  test('AUDITOR and DONOR -> 403, no token -> 401, AG_STUDIO_AI off -> 503, never calling Bedrock', async () => {
    const { ctx, bedrock } = await setup();
    for (const email of [AUDITOR, DONOR]) {
      assert.equal((await post(ctx, await loginAs(ctx.app, email), turn())).status, 403);
    }
    assert.equal((await post(ctx, null, turn())).status, 401);
    assert.equal(bedrock.inputs.length, 0);

    const off = await setup({ AG_STUDIO_AI: '' });
    assert.equal((await post(off.ctx, off.admin, turn())).status, 503);
    assert.equal(off.bedrock.inputs.length, 0);
  });

  test('GET /api/analytics reports the Bedrock model and does not need GROQ_API_KEY', async () => {
    const { ctx, admin } = await setup({ GROQ_API_KEY: '' });
    const res = await request(ctx.app).get('/api/analytics').set(bearer(admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.studio.aiEnabled, true);
    assert.deepEqual(res.body.studio.aiModels, [MODEL]);
  });
});
