import { jsonResponse } from './helpers.js';

// Stand-in for Groq's OpenAI-compatible chat completions endpoint. `script`
// is the list of assistant messages returned in order; an entry may also be a
// function (requestBody) => message so it can react to earlier tool results.
// Every parsed request body is recorded in `requests`. Running past the end
// of the script returns HTTP 500 so the test fails loudly.
export function makeFakeGroq(script) {
  const requests = [];

  async function fetch(url, init = {}) {
    const { pathname } = new URL(url);
    if ((init.method || 'GET').toUpperCase() !== 'POST' || !pathname.endsWith('/chat/completions')) {
      return jsonResponse(404, { error: { message: `unexpected ${pathname}` } });
    }
    const body = JSON.parse(init.body);
    requests.push(body);
    const entry = script[requests.length - 1];
    if (!entry) return jsonResponse(500, { error: { message: 'fake groq script exhausted' } });
    const message = typeof entry === 'function' ? entry(body) : entry;
    return jsonResponse(200, {
      id: 'chatcmpl-test-' + requests.length,
      object: 'chat.completion',
      model: body.model,
      choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }],
    });
  }

  return { fetch, requests };
}

let callSeq = 0;
export function toolCall(name, args) {
  callSeq += 1;
  return { id: `call_${callSeq}`, type: 'function', function: { name, arguments: JSON.stringify(args) } };
}
