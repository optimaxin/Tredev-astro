// Thin client for the real backend kundli-history API
// (backend/app/api/kundliHistory.routes.ts). Only the birth-detail inputs
// are stored server-side — the full Kundli result is always recomputed via
// calculatorService.kundliFull when a saved entry is opened, so a saved
// entry always reflects the current, most-accurate calculation engine.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface KundliHistoryEntry {
  id: number;
  name: string;
  date: string;
  time: string;
  timezoneOffsetMinutes: number;
  latitude: number;
  longitude: number;
  placeLabel: string | null;
  createdAt: number;
}

export class KundliHistoryApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/kundli-history${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
    });
  } catch {
    throw new KundliHistoryApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new KundliHistoryApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export interface SaveKundliHistoryInput {
  name: string;
  date: string;
  time: string;
  timezoneOffsetMinutes: number;
  latitude: number;
  longitude: number;
  placeLabel?: string | null;
}

export const kundliHistoryService = {
  save: (accessToken: string, entry: SaveKundliHistoryInput) =>
    request<KundliHistoryEntry>('/', accessToken, { method: 'POST', body: JSON.stringify(entry) }),

  list: (accessToken: string) => request<KundliHistoryEntry[]>('/', accessToken, { method: 'GET' }),

  remove: (accessToken: string, id: number) => request<null>(`/${id}`, accessToken, { method: 'DELETE' }),
};
