import { Router } from 'express';
import { actorFromUser, writeAudit } from '../audit.js';
import { requireAuth, requireRole } from '../auth.js';
import { runAgent } from '../ai/agent.js';
import { GroqError } from '../ai/groqClient.js';
import { HttpError } from '../errors.js';

const MAX_MESSAGES = 12;
const MAX_CONTENT_CHARS = 2000;
// Clients may only send user/assistant turns: no system prompts, no fake tool output.
const CLIENT_ROLES = ['user', 'assistant'];

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

export function aiRouter({ db, config, groq }) {
  const router = Router();

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

  return router;
}
