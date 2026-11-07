import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import { loginAs, makeTestContext } from './helpers.js';

const ADMIN = 'alok.v@reliefpay.org';
const AUDITOR = 'elena@auditcore.org';
const DONOR = 'mehta.r@techcorp.in';
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const SSE =
  'event: response.created\ndata: {"type":"response.created"}\n\n' +
  'data: {"type":"response.completed","response":{"id":"resp_1","output":[],"status":"completed"}}\n\n';

// Fake Groq Responses API: records each request; state.status/state.errorBody
// make it return an error instead of the SSE stream.
function makeFakeGroqResponses() {
  const requests = [];
  const state = {};
  async function fetch(url, init = {}) {
    const href = String(url);
    if (!href.endsWith('/responses') || init.method !== 'POST') {
      return new Response('not found', { status: 404 });
    }
    requests.push({ url: href, headers: init.headers, body: JSON.parse(init.body) });
    if (state.status) {
      return new Response(JSON.stringify(state.errorBody ?? {}), { status: state.status, headers: { 'content-type': 'application/json' } });
    }
    return new Response(SSE, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }
  return { fetch, requests, state };
}

async function setup(configOverrides = {}) {
  const groq = makeFakeGroqResponses();
  const ctx = makeTestContext({ configOverrides: { AG_STUDIO_AI: 'on', ...configOverrides }, groqFetch: groq.fetch });
  const admin = await loginAs(ctx.app, ADMIN);
  return { ctx, groq, admin };
}

const TOOL = {
  type: 'function',
  name: 'add_widget',
  description: 'Add a widget',
  strict: true,
  parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
};

const turn = (extra = {}) => ({
  model: 'openai/gpt-oss-120b',
  input: [{ role: 'user', content: 'Summarise this page' }],
  instructions: 'You are the AG Studio assistant.',
  tools: [TOOL],
  text: { format: { type: 'text' } },
  parallel_tool_calls: true,
  stream: true,
  ...extra,
});

const post = (ctx, token, body) => {
  const req = request(ctx.app).post('/api/ai/studio/responses');
  if (token) req.set(bearer(token));
  return req.send(body);
};

describe('POST /api/ai/studio/responses', () => {
  test('ADMIN streams the Groq SSE back with an allow-listed, capped upstream body', async () => {
    const { ctx, groq, admin } = await setup();
    const res = await post(ctx, admin, turn({
      reasoning: { effort: 'low' },
      store: true,
      previous_response_id: 'resp_0',
      include: ['reasoning.encrypted_content'],
      metadata: { a: 'b' },
      user: 'someone',
      max_output_tokens: 99999,
    }));
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /^text\/event-stream/);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.ok(res.text.includes('response.completed'));

    assert.equal(groq.requests.length, 1);
    const [upstream] = groq.requests;
    assert.ok(upstream.url.endsWith('/responses'));
    assert.equal(upstream.headers.Authorization, 'Bearer test-groq');
    assert.notEqual(upstream.headers.Authorization, `Bearer ${admin}`);
    assert.equal(upstream.body.model, 'openai/gpt-oss-120b');
    assert.equal(upstream.body.stream, true);
    assert.equal(upstream.body.max_output_tokens, 8192);
    assert.equal(upstream.body.reasoning.effort, 'low');
    for (const key of ['store', 'previous_response_id', 'include', 'metadata', 'user']) {
      assert.ok(!(key in upstream.body), key);
    }
    assert.deepEqual(upstream.body.tools, [TOOL]);
    assert.deepEqual(upstream.body.input, turn().input);
    assert.equal(upstream.body.instructions, 'You are the AG Studio assistant.');
    assert.equal(upstream.body.parallel_tool_calls, true);
    assert.ok(!res.text.includes('test-groq'));
  });

  test('unknown reasoning effort maps to medium; missing model uses the configured one', async () => {
    const { ctx, groq, admin } = await setup();
    const body = turn({ reasoning: { effort: 'xhigh' } });
    delete body.model;
    const res = await post(ctx, admin, body);
    assert.equal(res.status, 200);
    assert.equal(groq.requests[0].body.reasoning.effort, 'medium');
    assert.equal(groq.requests[0].body.model, 'openai/gpt-oss-120b');
  });

  test('a model outside the allow-list -> 400 and no upstream call', async () => {
    const { ctx, groq, admin } = await setup();
    const res = await post(ctx, admin, turn({ model: 'gpt-4o' }));
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error.message, 'string');
    assert.match(res.body.error.message, /gpt-4o/);
    assert.equal(groq.requests.length, 0);
  });

  test('missing input -> 400', async () => {
    const { ctx, groq, admin } = await setup();
    const body = turn();
    delete body.input;
    const res = await post(ctx, admin, body);
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error.message, 'string');
    assert.equal(groq.requests.length, 0);
  });

  test('AUDITOR and DONOR -> 403, no token -> 401, never calling Groq', async () => {
    const { ctx, groq } = await setup();
    for (const email of [AUDITOR, DONOR]) {
      assert.equal((await post(ctx, await loginAs(ctx.app, email), turn())).status, 403);
    }
    assert.equal((await post(ctx, null, turn())).status, 401);
    assert.equal(groq.requests.length, 0);
  });

  test("GROQ_API_KEY '' -> 503 with error.message", async () => {
    const { ctx, groq, admin } = await setup({ GROQ_API_KEY: '' });
    const res = await post(ctx, admin, turn());
    assert.equal(res.status, 503);
    assert.equal(typeof res.body.error.message, 'string');
    assert.equal(groq.requests.length, 0);
  });

  test("AG_STUDIO_AI unset or 'off' -> 503", async () => {
    for (const value of ['', 'off']) {
      const { ctx, groq, admin } = await setup({ AG_STUDIO_AI: value });
      const res = await post(ctx, admin, turn());
      assert.equal(res.status, 503);
      assert.equal(groq.requests.length, 0);
    }
  });

  test('upstream 429 -> 429 { error: { message } }', async () => {
    const { ctx, groq, admin } = await setup();
    groq.state.status = 429;
    groq.state.errorBody = { error: { message: 'Rate limit reached for model' } };
    const res = await post(ctx, admin, turn());
    assert.equal(res.status, 429);
    assert.equal(res.body.error.message, 'Rate limit reached for model');
  });

  test('a ~300 kB body is accepted here while /api/ai/chat still returns 413', async () => {
    const { ctx, groq, admin } = await setup();
    const big = 'x'.repeat(300 * 1024);
    const res = await post(ctx, admin, turn({ instructions: big }));
    assert.equal(res.status, 200);
    assert.equal(groq.requests[0].body.instructions.length, big.length);

    const chat = await request(ctx.app)
      .post('/api/ai/chat')
      .set(bearer(admin))
      .send({ messages: [{ role: 'user', content: big }] });
    assert.equal(chat.status, 413);
    assert.equal(chat.body.error, 'PAYLOAD_TOO_LARGE');
  });
});
