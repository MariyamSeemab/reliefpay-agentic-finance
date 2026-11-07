// The AG Studio AI assistant. The verbatim adapter posts to `${endpoint}/responses`,
// i.e. our ADMIN-only proxy POST /api/ai/studio/responses, which calls Groq or
// Amazon Bedrock (AG_STUDIO_AI_PROVIDER) with server-side credentials. The adapter's
// `key` is the signed-in user's JWT, so the proxy can authenticate the request; no
// AI provider credentials reach the browser.

import { createAiHarness } from 'ag-studio';
import { API_BASE } from '../../../lib/api';
import { openaiAdapter } from './openaiAdapter';

const PROMPT_STARTERS = [
  { label: 'Summarise this page', prompt: 'Summarise what this page shows and what stands out.' },
  { label: 'Least-funded campaigns', prompt: 'Which active campaigns are furthest from their target?' },
  { label: 'Top donors', prompt: 'Add a bar chart of the top 5 donors by net donated.' },
];

// `models` are the ids the server allows (GET /api/analytics -> studio.aiModels).
export function buildAi(models, token) {
  const adapter = openaiAdapter({ endpoint: `${API_BASE}/ai/studio`, key: token, model: models[0] });

  return ({ api }) =>
    createAiHarness(api, {
      adapter,
      promptStarters: PROMPT_STARTERS,
    });
}
