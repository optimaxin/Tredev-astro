// Thin REST client for the realtime consultation-assignment backend
// (server/). Every write goes through here; the server is the sole source
// of truth — this file does not cache or reinterpret anything.
import type {
  AstrologerSyncSnapshot, PublicAstrologerState, RecommendedAstrologer, RequestResult, UserSyncSnapshot, AstrologerNotification, Consultation, QueueEntry,
} from './types';

export const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:4000';

export class RealtimeApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new RealtimeApiError('Realtime service is unreachable. Is the backend running (npm run server)?');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new RealtimeApiError(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export interface AdminConfig {
  maxQueueWaitMinutes: number;
  awayTimeoutMinutes: number;
  defaultConsultationMinutes: number;
  defaultMaxConcurrent: number;
}

export const realtimeApi = {
  listAstrologers: () => request<PublicAstrologerState[]>('/api/astrologers'),
  recommendations: (astrologerId: number, category: string) =>
    request<{ usedFallback: boolean; astrologers: RecommendedAstrologer[] }>(`/api/astrologers/${astrologerId}/recommendations?category=${encodeURIComponent(category)}`),
  setAvailability: (email: string, intent: 'ONLINE' | 'OFFLINE') =>
    request<{ status: string }>('/api/availability', { method: 'POST', body: JSON.stringify({ email, intent }) }),
  heartbeat: (email: string) => request('/api/heartbeat', { method: 'POST', body: JSON.stringify({ email }) }),
  astrologerSync: (astrologerId: number) => request<AstrologerSyncSnapshot>(`/api/astrologers/${astrologerId}/sync`),
  userSync: (email: string) => request<UserSyncSnapshot>(`/api/users/sync?email=${encodeURIComponent(email)}`),
  requestConsultation: (params: { requestId: string; astrologerId: number; userEmail: string; userName: string; category: string; type: string }) =>
    request<RequestResult>('/api/consultations/request', { method: 'POST', body: JSON.stringify(params) }),
  acceptConsultation: (id: string, email: string) => request<Consultation>(`/api/consultations/${id}/accept`, { method: 'POST', body: JSON.stringify({ email }) }),
  declineConsultation: (id: string, email: string) => request<Consultation>(`/api/consultations/${id}/decline`, { method: 'POST', body: JSON.stringify({ email }) }),
  endConsultation: (id: string, email: string) => request<Consultation>(`/api/consultations/${id}/end`, { method: 'POST', body: JSON.stringify({ email }) }),
  cancelQueueEntry: (id: string, email: string) => request<QueueEntry>(`/api/queue/${id}/cancel`, { method: 'POST', body: JSON.stringify({ email }) }),
  listNotifications: (email: string) => request<AstrologerNotification[]>(`/api/notifications?email=${encodeURIComponent(email)}`),
  markNotificationRead: (id: string, email: string) => request(`/api/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({ email }) }),
  markAllNotificationsRead: (email: string) => request('/api/notifications/read-all', { method: 'POST', body: JSON.stringify({ email }) }),
  getAdminConfig: () => request<AdminConfig>('/api/admin/config'),
  updateAdminConfig: (partial: Partial<AdminConfig>) => request<AdminConfig>('/api/admin/config', { method: 'POST', body: JSON.stringify(partial) }),
  setMaxConcurrent: (astrologerId: number, maxConcurrent: number) =>
    request<{ maxConcurrent: number }>(`/api/admin/astrologers/${astrologerId}/max-concurrent`, { method: 'POST', body: JSON.stringify({ maxConcurrent }) }),
};
