import { Readable } from 'node:stream';
import express, { Router } from 'express';
import { actorFromUser, writeAudit } from '../audit.js';
import { requireAuth, requireRole } from '../auth.js';
import { runAgent } from '../ai/agent.js';
import { StudioTranslationError, bedrockErrorResponse, toConverseInput, toResponsesEvents } from '../ai/bedrockStudio.js';
import { GroqError } from '../ai/groqClient.js';
import { suggestSplit } from '../ai/splitSuggest.js';
import { HttpError } from '../errors.js';

const MAX_MESSAGES = 12;
const MAX_CONTENT_CHARS = 2000;
// Clients may only send user/assistant turns: no system prompts, no fake tool output.
const CLIENT_ROLES = ['user', 'assistant'];

// AG Studio assistant proxy (POST /ai/studio/responses). Only these request
// fields reach Groq; Groq's Responses API is stateless and rejects store,
// previous_response_id, include, truncation, safety_identifier, prompt_cache_key
// and prompt, so they (and anything else) are dropped.
const STUDIO_BODY_LIMIT = '1mb';
const STUDIO_MAX_OUTPUT_TOKENS = 8192;
const STUDIO_FORWARDED_KEYS = ['input', 'instructions', 'tools', 'tool_choice', 'text', 'parallel_tool_calls', 'temperature', 'top_p'];
const REASONING_EFFORTS = ['low', 'medium', 'high'];

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_MESSAGES) {
    throw new HttpError(400, 'INVALID_MESSAGES', `Provide 1 to ${MAX_MESSAGES} messages`);
  }
  const clean = messages.map((m) => {
    if (!m || typeof m !== 'object' || !CLIENT_ROLES.includes(m.role)) {
      throw new HttpError(400, 'INVALID_MESSAGES', "Message role must be 'user' or 'assistant'");
    }
    if (typeof m.content !== 'string' || m.content.length > MAX_CONTENT_CHARS) {
      throw new HttpError(400, 'INVALID_MESSAGES', `Message content must be a string of at most ${MAX_CONTENT_CHARS} characters`);
    }
    return { role: m.role, content: m.content };
  });
  const last = clean[clean.length - 1];
  if (last.role !== 'user' || last.content.trim() === '') {
    throw new HttpError(400, 'INVALID_MESSAGES', 'The last message must be a non-empty user message');
  }
  return clean;
}

export function aiRouter({ db, config, groq, bedrockStudio }) {
  const router = Router();

  // AG_STUDIO_AI_PROVIDER=bedrock: same auth, model allow-list and output cap as
  // the Groq path, but the Responses body is translated to Bedrock ConverseStream
  // and the stream back to Responses SSE events (see ai/bedrockStudio.js).
  async function studioViaBedrock(req, res) {
    if (!bedrockStudio || !config.agStudio.aiEnabled) {
      return res.status(503).json({ error: { message: 'The AG Studio assistant is not configured on the server' } });
    }
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.input)) {
      return res.status(400).json({ error: { message: 'Request body must be an object with an input array' } });
    }
    const allowedModels = [config.agStudio.bedrock.model];
    const model = typeof body.model === 'string' && body.model ? body.model : allowedModels[0];
    if (!allowedModels.includes(model)) {
      return res.status(400).json({ error: { message: `Model "${model}" is not enabled.` } });
    }

    let translated;
    try {
      translated = toConverseInput(body, { model, maxTokens: STUDIO_MAX_OUTPUT_TOKENS });
    } catch (err) {
      if (!(err instanceof StudioTranslationError)) throw err;
      return res.status(400).json({ error: { message: err.message } });
    }

    const controller = new AbortController();
    res.on('close', () => controller.abort());

    let upstream;
    try {
      upstream = await bedrockStudio.converseStream(translated.input, { signal: controller.signal });
    } catch (err) {
      const [status, message] = bedrockErrorResponse(err);
      console.error('[bedrock studio]', err?.name, status);
      return res.status(status).json({ error: { message } });
    }
    console.log('[bedrock studio]', upstream?.$metadata?.httpStatusCode ?? 200);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    for await (const event of toResponsesEvents(upstream.stream ?? [], { model, jsonMode: translated.jsonMode })) {
      if (res.writableEnded || res.destroyed) break;
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    }
    res.end();
  }

  router.post('/ai/chat', requireAuth(db, config), requireRole('ADMIN'), async (req, res) => {
    const messages = validateMessages(req.body?.messages);
    if (!groq?.isConfigured) {
      throw new HttpError(503, 'AI_NOT_CONFIGURED', 'GROQ_API_KEY is not configured on the server');
    }

    writeAudit(db, {
      actor: actorFromUser(req.user),
      action: 'AI_CHAT',
      target: 'AI Command Centre',
      status: 'RECORDED',
      details: { message: messages[messages.length - 1].content.slice(0, 200), model: config.groq.model },
    });

    let result;
    try {
      result = await runAgent({ db, config, groq, user: req.user, messages });
    } catch (err) {
      if (!(err instanceof GroqError)) throw err;
      console.error('[groq]', err.status, err.message);
      if (err.status === 429) throw new HttpError(503, 'AI_RATE_LIMITED', 'Groq rate limit reached; try again shortly');
      throw new HttpError(502, 'AI_ERROR', 'The AI service request failed');
    }
    res.json({ ...result, model: config.groq.model });
  });

  // Any signed-in user. Proposes percentages only; never creates an order.
  router.post('/ai/suggest-split', requireAuth(db, config), async (req, res) => {
    const amount = req.body?.amount;
    let suggestion;
    try {
      suggestion = await suggestSplit({ db, groq, amount });
    } catch (err) {
      if (!(err instanceof GroqError)) throw err;
      console.error('[groq]', err.status, err.message);
      if (err.status === 429) throw new HttpError(503, 'AI_RATE_LIMITED', 'Groq rate limit reached; try again shortly');
      throw new HttpError(502, 'AI_ERROR', 'The AI service request failed');
    }
    writeAudit(db, {
      actor: actorFromUser(req.user),
      action: 'AI_SPLIT_SUGGESTED',
      target: 'Split donation',
      status: 'RECORDED',
      details: {
        amount,
        model: config.groq.model,
        allocations: suggestion.allocations.map((a) => ({ campaignId: a.campaignId, percent: a.percent })),
      },
    });
    res.json({ ...suggestion, model: config.groq.model });
  });

  // Streaming proxy from AG Studio's assistant adapter to Groq's Responses API.
  // ADMIN only; the Groq key stays on the server. Auth runs before the body is
  // parsed (the global 100 kb parser skips /api/ai/studio/, see app.js).
  router.post(
    '/ai/studio/responses',
    requireAuth(db, config),
    requireRole('ADMIN'),
    express.json({ limit: STUDIO_BODY_LIMIT }),
    async (req, res) => {
      if (config.agStudio.aiProvider === 'bedrock') return studioViaBedrock(req, res);
      if (!groq?.isConfigured || !config.agStudio.aiEnabled) {
        return res.status(503).json({ error: { message: 'The AG Studio assistant is not configured on the server' } });
      }
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.input)) {
        return res.status(400).json({ error: { message: 'Request body must be an object with an input array' } });
      }
      const allowedModels = [config.groq.model];
      const model = typeof body.model === 'string' && body.model ? body.model : allowedModels[0];
      if (!allowedModels.includes(model)) {
        return res.status(400).json({ error: { message: `Model "${model}" is not enabled.` } });
      }

      const upstreamBody = {};
      for (const key of STUDIO_FORWARDED_KEYS) {
        if (body[key] !== undefined) upstreamBody[key] = body[key];
      }
      upstreamBody.model = model;
      upstreamBody.stream = true;
      upstreamBody.max_output_tokens = STUDIO_MAX_OUTPUT_TOKENS;
      upstreamBody.reasoning = {
        effort: REASONING_EFFORTS.includes(body.reasoning?.effort) ? body.reasoning.effort : 'medium',
      };

      const controller = new AbortController();
      res.on('close', () => controller.abort());

      let upstream;
      try {
        upstream = await groq.responsesStream({ body: upstreamBody, signal: controller.signal });
      } catch (err) {
        if (!(err instanceof GroqError)) throw err;
        console.error('[groq studio]', err.status);
        return res.status(502).json({ error: { message: 'The AI service request failed' } });
      }

      console.log('[groq studio]', upstream.status);
      if (!upstream.ok) {
        const text = await upstream.text().catch(() => '');
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          // non-JSON error body
        }
        return res
          .status(upstream.status)
          .json({ error: { message: parsed?.error?.message || `Groq request failed with HTTP ${upstream.status}` } });
      }

      res.status(200);
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Accel-Buffering', 'no');
      if (!upstream.body) return res.end();
      const stream = Readable.fromWeb(upstream.body);
      stream.on('error', (err) => {
        console.error('[groq studio] stream error', err.name);
        res.end();
      });
      stream.pipe(res);
    },
  );

  return router;
}
