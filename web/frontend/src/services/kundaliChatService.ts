// Thin client for the kundali-chat Python microservice (Extra/kundali-chat-master).
// Separate service + base URL from the main Express backend — this talks
// directly to the FastAPI app, not through calculatorService/API_URL.

const CHAT_URL = (import.meta.env.VITE_KUNDALI_CHAT_URL || 'http://localhost:8000').replace(/\/+$/, '');

export class KundaliChatApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${CHAT_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  } catch {
    throw new KundaliChatApiError('Could not reach the astrologer chat service.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new KundaliChatApiError(body?.detail ? String(body.detail) : `Chat request failed (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

export interface ChatBirthDetails {
  name: string;
  gender?: string;
  dob: string; // YYYY-MM-DD
  tob: string; // HH:MM
  latitude: number;
  longitude: number;
  place?: string;
  timezone_offset_minutes: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'complete' | 'failed';
  created_at: string;
}

export const kundaliChatService = {
  createSession: (birth: ChatBirthDetails) =>
    request<{ session_id: string; kundali: Record<string, unknown> }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(birth),
    }),

  sendMessage: (sessionId: string, content: string) =>
    request<{ message_id: string }>(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  pollMessages: (sessionId: string, after?: string) =>
    request<{ messages: ChatMessage[] }>(
      `/sessions/${sessionId}/messages${after ? `?after=${after}` : ''}`,
    ),
};
