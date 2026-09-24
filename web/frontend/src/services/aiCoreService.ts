// Thin client for the ai-core astrology chatbot (the Python/FastAPI service
// in /ai-core). Separate base URL from the Express backend on purpose — this
// talks straight to ai-core, which owns the LLM, Pinecone and Redis keys.
//
// Note what is NOT sent here: the computed kundli. The browser holds a full
// chart by the time this widget appears, but ai-core recomputes it from the
// birth details instead, so nothing the browser could tamper with ends up in
// the model's prompt. See ai-core/app/kundli/kundli_service.py.

const AI_CORE_URL = (import.meta.env.VITE_AI_CORE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export class AiCoreApiError extends Error {}

export interface AiCoreBirthDetails {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24h
  timezoneOffsetMinutes: number;
  latitude: number;
  longitude: number;
  name?: string;
  placeLabel?: string;
}

export interface AiCoreSource {
  id: string;
  document: string;
  domain: string;
  topic: string;
  score: number;
}

export interface AiCoreUsage {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  tokens_available: boolean;
  model: string | null;
  estimated_cost_usd: number | null;
  provider_cost_usd: number | null;
  turn_total_tokens: number | null;
  turn_cost_usd: number | null;
  llm_calls: number;
}

export interface AiCoreChatResponse {
  answer: string;
  // The same answer split into chat bubbles by the server.
  messages: string[];
  persona: string;
  session_id: string;
  request_id: string;
  intent: string;
  sources: AiCoreSource[];
  chart_facts_used: string[];
  usage: AiCoreUsage;
  latency_ms: number;
  // True when the model could not be reached — the text is an honest
  // "try again" note, not a reading, so the UI must not dress it up as one.
  degraded: boolean;
  notices: string[];
}

export interface AiCorePersona {
  id: string;
  name: string;
  specialization: string;
  tone: string;
  system: string;
  topicTags: string[];
  topK: number | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AI_CORE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new AiCoreApiError('Could not reach the astrology assistant. Please try again.');
  }

  if (res.status === 429) {
    throw new AiCoreApiError('You are asking a little too quickly — give it a moment and try again.');
  }
  if (!res.ok) {
    // ai-core returns {error, detail} and never a stack trace, but a proxy in
    // front of it might return anything, so nothing from the body is trusted
    // as display text unless it is the short `detail` string we expect.
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === 'string' ? body.detail : null;
    throw new AiCoreApiError(detail || 'The astrology assistant could not answer that right now.');
  }
  return res.json() as Promise<T>;
}

// One anonymous id per browser, reused across visits so rate limiting and
// usage attribution are stable. It is not an account and identifies nobody —
// the chart itself is keyed server-side off the birth details.
function anonymousUserId(): string {
  const KEY = 'ai_core_anon_id';
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = `web-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Private mode / blocked storage: a per-load id still works fine.
    return `web-ephemeral-${Date.now().toString(36)}`;
  }
}

export const aiCoreService = {
  anonymousUserId,

  ask: (params: {
    question: string;
    birth: AiCoreBirthDetails;
    sessionId: string;
    personaId?: string;
    userId?: string;
  }) =>
    request<AiCoreChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        user_id: params.userId || anonymousUserId(),
        session_id: params.sessionId,
        persona_id: params.personaId,
        question: params.question,
        birth: params.birth,
        chat_bubbles: true,
      }),
    }),

  personas: () => request<AiCorePersona[]>('/personas'),
};
