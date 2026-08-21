// Thin client for the real admin API (backend/app/api/admin.routes.ts).
// Every call requires a real ADMIN-role JWT — the backend verifies this
// server-side, this file just attaches whatever token is currently stored.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class AdminApiError extends Error {
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
    res = await fetch(`${API_URL}/api/admin${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new AdminApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new AdminApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export interface ApiUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ASTROLOGIST' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

export interface ApiApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  expertise: string;
  experience: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  decidedAt: string | null;
}

export interface ApiAuditEntry {
  id: string;
  actor_user_id: string | null;
  actor_label: string;
  action: string;
  target: string;
  created_at: string;
}

export interface ApiConsultation {
  id: string;
  astrologerId: number;
  userEmail: string;
  userName: string;
  category: string;
  type: 'chat' | 'voice' | 'video';
  status: 'ASSIGNED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  createdAt: number;
  acceptedAt?: number;
  startedAt?: number;
  endedAt?: number;
}

export const adminService = {
  listUsers: () => request<ApiUserRecord[]>('/users'),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<{ ok: boolean }>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateUserRole: (id: string, role: 'USER' | 'ASTROLOGIST' | 'ADMIN') =>
    request<{ ok: boolean }>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  addAstrologer: (name: string, email: string, password: string) =>
    request<ApiUserRecord>('/astrologers', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  listApplications: () => request<ApiApplication[]>('/astrologer-applications'),
  approveApplication: (id: string) => request<{ ok: boolean }>(`/astrologer-applications/${id}/approve`, { method: 'POST' }),
  rejectApplication: (id: string) => request<{ ok: boolean }>(`/astrologer-applications/${id}/reject`, { method: 'POST' }),

  listConsultations: (page = 1, limit = 100) => request<ApiConsultation[]>(`/consultations?page=${page}&limit=${limit}`),

  listAuditLog: (page = 1, limit = 100) => request<ApiAuditEntry[]>(`/audit-log?page=${page}&limit=${limit}`),
  logNote: (action: string, target: string) => request<{ ok: boolean }>('/audit-log', { method: 'POST', body: JSON.stringify({ action, target }) }),
};
