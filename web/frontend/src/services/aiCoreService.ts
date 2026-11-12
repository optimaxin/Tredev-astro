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
  // Issued to logged-out visitors on their first reply; echoed back
  // automatically by this service.
  session_token?: string | null;
  // Knowledge-base documents this answer actually drew on (validated
  // server-side against what was retrieved; never invented).
  citations?: AiCoreCitation[];
}

export interface AiCoreCitation {
  id: string;
  title: string;
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

// Identity for ai-core is decided server-side: a signed-in user's access
// token (verified by the backend), or — for logged-out visitors — a signed
// session token ai-core issued on the first reply. Neither is invented here.
const SESSION_TOKEN_KEY = 'ai_core_session_token';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const accessToken = localStorage.getItem('auth_access_token');
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) headers['X-Chat-Session-Token'] = sessionToken;
  } catch {
    // Storage blocked: the request goes out anonymous, which still works.
  }
  return headers;
}

function rememberSessionToken(token: string | null | undefined) {
  if (!token) return;
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // Storage blocked: the next turn simply starts a fresh anonymous session.
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AI_CORE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
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


export type FeedbackType = 'helpful' | 'not_helpful';

// Mirrors NEGATIVE_REASONS / POSITIVE_REASONS in ai-core's schemas.py. A
// closed set so the admin dashboard can rank them rather than reading free
// text; `other` plus the optional comment covers the rest.
export const NEGATIVE_REASONS: { value: string; label: string }[] = [
  { value: 'incorrect_information', label: 'Incorrect information' },
  { value: 'too_generic', label: 'Too generic' },
  { value: 'too_long', label: 'Too long' },
  { value: 'did_not_answer', label: "Didn't answer my question" },
  { value: 'not_personalized', label: 'Not personalized' },
  { value: 'poor_hinglish', label: 'Poor Hinglish' },
  { value: 'too_formal', label: 'Too formal' },
  { value: 'not_conversational', label: 'Not conversational' },
  { value: 'wrong_context_usage', label: 'Wrong chart/context usage' },
  { value: 'other', label: 'Other' },
];

export interface FeedbackResult {
  recorded: boolean;
  request_id: string;
  feedback_type: FeedbackType;
  // False when the store is unreachable. The thumb still shows as selected —
  // a lost vote must not look like a broken button.
  persisted: boolean;
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
        // Kept for API compatibility; ai-core derives identity itself.
        user_id: params.userId || anonymousUserId(),
        session_id: params.sessionId,
        persona_id: params.personaId,
        question: params.question,
        birth: params.birth,
        chat_bubbles: true,
      }),
    }).then((res) => {
      rememberSessionToken(res.session_token);
      return res;
    }),

  personas: () => request<AiCorePersona[]>('/personas'),

  // What the user thought of one reply, keyed by the request_id the chat
  // response already returned. Changing a vote overwrites the previous one
  // server-side rather than adding a second.
  submitFeedback: (params: {
    requestId: string;
    feedbackType: FeedbackType;
    conversationId?: string;
    rating?: number;
    reason?: string;
    comment?: string;
    userId?: string;
  }) =>
    request<FeedbackResult>('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        request_id: params.requestId,
        user_id: params.userId || anonymousUserId(),
        feedback_type: params.feedbackType,
        conversation_id: params.conversationId,
        rating: params.rating,
        feedback_reason: params.reason,
        feedback_comment: params.comment,
      }),
    }),
};
