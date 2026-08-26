// Thin client for the user's own consultation history
// (backend/app/api/chat.routes.ts's GET /api/consultations/mine).
import { API_URL } from './apiUrl';

export class ConsultationApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface MyConsultation {
  id: string;
  astrologerId: number;
  astrologerName: string;
  category: string;
  type: 'chat' | 'voice' | 'video';
  status: 'ASSIGNED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  createdAt: number;
  reviewed: boolean;
}

export interface MyConsultationAsAstrologer {
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
  estimatedAmount: number;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = localStorage.getItem('auth_access_token');
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ConsultationApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new ConsultationApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  return body.data as T;
}

export const consultationService = {
  listMine: () => authedGet<MyConsultation[]>('/api/consultations/mine'),
  listMineAsAstrologer: () => authedGet<MyConsultationAsAstrologer[]>('/api/consultations/mine-as-astrologer'),
};
