// Thin client for the user's own consultation history
// (backend/app/api/chat.routes.ts's GET /api/consultations/mine).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

export const consultationService = {
  async listMine(): Promise<MyConsultation[]> {
    const token = localStorage.getItem('auth_access_token');
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/consultations/mine`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      throw new ConsultationApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
    }
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) throw new ConsultationApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
    return body.data as MyConsultation[];
  },
};
