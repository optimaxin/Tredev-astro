// Thin client for the ai-core astrology chatbot (the Python/FastAPI service
// in /ai-core). Separate base URL from the Express backend on purpose — this
// talks straight to ai-core, which owns the LLM, Pinecone and Redis keys.
//
// Note what is NOT sent here: the computed kundli. The browser holds a full
// chart by the time this widget appears, but ai-core recomputes it from the
// birth details instead, so nothing the browser could tamper with ends up in
// the model's prompt. See ai-core/app/kundli/kundli_service.py.

import { drainSseBuffer } from './sse';

const AI_CORE_URL =(import.meta.env.VITE_AI_CORE_URL || 'http://localhost:8000').replace(/\/+$/, '');

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
  // One reply is ONE message (paragraphs separated by blank lines). Kept as a
  // list for compatibility; render `answer` in a single bubble.
  messages: string[];
  // The language style the server resolved for this reply.
  response_style?: string;
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


// ── streaming (POST /chat/stream, Server-Sent Events) ──────────────────
// One assistant TURN per reply, made of 1–4 semantic SEGMENTS (one chat
// bubble each, chosen by the model by topic): `start` gives the turn id;
// `segment_start` opens a bubble; `delta` events append to that segment;
// `segment_end` carries the segment's full text; `done` carries the final,
// authoritative `messages` (one per bubble) + metadata; `error` replaces
// `done` on failure. `status` reports progress while the server works.
export type AiCoreStreamStage =
  | 'reading_chart' | 'understanding' | 'consulting_knowledge' | 'writing' | 'checking';

export interface AiCoreStreamHandlers {
  onStart?: (messageId: string) => void;
  onStatus?: (stage: AiCoreStreamStage) => void;
  onSegmentStart?: (segmentId: string, index: number) => void;
  onDelta?: (segmentId: string, text: string) => void;
  onSegmentEnd?: (segmentId: string, index: number, text: string) => void;
}

// Thrown when the stream endpoint itself is unavailable (older ai-core, a
// proxy that buffers SSE...) BEFORE anything was shown, so the caller can
// safely fall back to the plain /chat request.
export class AiCoreStreamUnavailable extends Error {}

async function streamChat(body: Record<string, unknown>, handlers: AiCoreStreamHandlers): Promise<AiCoreChatResponse> {
  let res: Response;
  try {
    res = await fetch(`${AI_CORE_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiCoreStreamUnavailable('stream unreachable');
  }
  if (res.status === 429) {
    throw new AiCoreApiError('You are asking a little too quickly — give it a moment and try again.');
  }
  if (!res.ok || !res.body || !(res.headers.get('content-type') || '').includes('text/event-stream')) {
    throw new AiCoreStreamUnavailable(`stream endpoint unavailable (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let started = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const drained = drainSseBuffer(buffer + decoder.decode(value, { stream: true }));
    buffer = drained.rest;
    for (const parsed of drained.events) {
      const data = parsed.data as Record<string, unknown>;
      if (parsed.event === 'start') {
        started = true;
        handlers.onStart?.(String(data.message_id || ''));
      } else if (parsed.event === 'status') {
        handlers.onStatus?.(data.stage as AiCoreStreamStage);
      } else if (parsed.event === 'segment_start') {
        handlers.onSegmentStart?.(String(data.segment_id), Number(data.index));
      } else if (parsed.event === 'delta') {
        handlers.onDelta?.(String(data.segment_id ?? 'seg-0'), String(data.text ?? ''));
      } else if (parsed.event === 'segment_end') {
        handlers.onSegmentEnd?.(String(data.segment_id), Number(data.index), String(data.text ?? ''));
      } else if (parsed.event === 'done') {
        const final = data as unknown as AiCoreChatResponse;
        rememberSessionToken(final.session_token);
        return final;
      } else if (parsed.event === 'error') {
        throw new AiCoreApiError(typeof data.detail === 'string' ? data.detail
          : 'The astrology assistant could not answer that right now.');
      }
    }
  }
  if (!started) throw new AiCoreStreamUnavailable('stream closed before it started');
  throw new AiCoreApiError('The connection dropped before the answer finished. Please try again.');
}

export interface AiCoreHistoryTurn {
  role: 'user' | 'assistant';
  text?: string;          // user turns
  messages?: string[];    // assistant turns, one entry per bubble
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

  // Same turn as `ask`, streamed segment by segment. Falls back to `ask` when
  // the stream endpoint is unavailable and nothing has been shown yet; the
  // turn is never sent twice once the stream has started.
  askStream: async (
    params: { question: string; birth: AiCoreBirthDetails; sessionId: string; personaId?: string; userId?: string },
    handlers: AiCoreStreamHandlers,
  ): Promise<AiCoreChatResponse> => {
    const body = {
      user_id: params.userId || anonymousUserId(),
      session_id: params.sessionId,
      persona_id: params.personaId,
      question: params.question,
      birth: params.birth,
      chat_bubbles: true,
    };
    try {
      return await streamChat(body, handlers);
    } catch (err) {
      if (!(err instanceof AiCoreStreamUnavailable)) throw err;
      const res = await aiCoreService.ask(params);
      const parts = res.messages?.length ? res.messages : [res.answer].filter(Boolean);
      parts.forEach((text, index) => {
        handlers.onSegmentStart?.(`fallback-${index}`, index);
        handlers.onSegmentEnd?.(`fallback-${index}`, index, text);
      });
      return res;
    }
  },

  // This chart's earlier conversation, each assistant turn already split into
  // the bubbles it was shown as. Empty when there is no identity yet.
  history: (sessionId: string) =>
    request<{ session_id: string; turns: AiCoreHistoryTurn[] }>(
      `/chat/history?session_id=${encodeURIComponent(sessionId)}`,
    ).then(res => res.turns || []),

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
