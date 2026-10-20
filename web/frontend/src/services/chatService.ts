// Thin client for consultation chat messages
// (backend/app/api/chat.routes.ts's GET/POST /api/consultations/:id/messages).
import { API_URL } from './apiUrl';
import type { KundliFullResult } from './calculatorService';

export class ChatApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_access_token');
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/consultations${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new ChatApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new ChatApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export type SenderRole = 'USER' | 'ASTROLOGIST';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  consultationId: string;
  senderEmail: string;
  senderRole: SenderRole;
  messageType: MessageType;
  content: string;
  createdAt: number;
}

export interface ClientKundliContext {
  userName: string;
  hasBirthDetails: boolean;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthTimezoneOffsetMinutes?: number;
  kundliFull?: KundliFullResult;
}

export const chatService = {
  listMessages: (consultationId: string) => request<ChatMessage[]>(`/${consultationId}/messages`),
  // `content` is plain text for TEXT, a base64 data URL for IMAGE/AUDIO/FILE
  // (see the backend's sendMessageSchema comment — no upload/object-storage
  // service exists in this app, so the data URL travels in the message body).
  sendMessage: (consultationId: string, content: string, messageType: MessageType = 'TEXT') =>
    request<ChatMessage>(`/${consultationId}/messages`, { method: 'POST', body: JSON.stringify({ content, messageType }) }),
  // Astrologer-only — the client's real Kundli for this consultation.
  getClientKundli: (consultationId: string) => request<ClientKundliContext>(`/${consultationId}/client-kundli`),
};
