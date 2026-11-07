// Minimal client for Groq's OpenAI-compatible chat completions API (plain
// fetch, no SDK). Messages must not carry a `name` field: Groq rejects it.

export class GroqError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
  }
}

export function createGroqClient({ apiKey, baseUrl, model, fetch = globalThis.fetch }) {
  const isConfigured = Boolean(apiKey);

  async function chat({ messages, tools }) {
    if (!isConfigured) throw new GroqError(503, 'GROQ_API_KEY is not configured');
    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.2,
          max_completion_tokens: 1024,
        }),
      });
    } catch (err) {
      throw new GroqError(0, `Network error calling Groq: ${err.message}`);
    }

    let body = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON body; handled below
    }
    if (!res.ok) {
      throw new GroqError(res.status, body?.error?.message || `Groq request failed with HTTP ${res.status}`);
    }
    const message = body?.choices?.[0]?.message;
    if (!message) throw new GroqError(502, 'Groq returned no message');
    return message;
  }

  // One chat completion without tools, e.g. with a strict json_schema
  // response_format. reasoning_effort (low|medium|high) is sent only when given.
  async function complete({ messages, responseFormat, maxTokens = 512, reasoningEffort }) {
    if (!isConfigured) throw new GroqError(503, 'GROQ_API_KEY is not configured');
    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          response_format: responseFormat,
          max_completion_tokens: maxTokens,
          temperature: 0.2,
          ...(reasoningEffort && { reasoning_effort: reasoningEffort }),
        }),
      });
    } catch (err) {
      throw new GroqError(0, `Network error calling Groq: ${err.message}`);
    }

    let body = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON body; handled below
    }
    if (!res.ok) {
      throw new GroqError(res.status, body?.error?.message || `Groq request failed with HTTP ${res.status}`);
    }
    const message = body?.choices?.[0]?.message;
    if (!message) throw new GroqError(502, 'Groq returned no message');
    return message;
  }

  // Streaming Responses API call for the AG Studio assistant proxy. Returns the
  // raw fetch Response so the caller can pipe the SSE body; the caller builds
  // the (allow-listed) body and handles non-2xx statuses.
  async function responsesStream({ body, signal }) {
    if (!isConfigured) throw new GroqError(503, 'GROQ_API_KEY is not configured');
    try {
      return await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      throw new GroqError(0, `Network error calling Groq: ${err.message}`);
    }
  }

  return { isConfigured, model, chat, complete, responsesStream };
}
