// Thin client for the Pooja hub (backend/app/api/routes.ts's '/pooja/*').
// These are the older, un-enveloped realtime-style routes (see banners'
// '/banners/active') — plain JSON, no {success, data} wrapper, unlike the
// newer admin/content APIs.
import { API_URL } from './apiUrl';

export interface PoojaVideo {
  id: string;
  title: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdAt: number;
}

// meetingUrl is only present once `join` succeeds — the public list never
// carries it (see routes.ts).
export interface PoojaGroupSession {
  id: string;
  title: string;
  panditName: string;
  scheduledAt: number;
  meetingUrl?: string | null;
  pricePaise: number | null;
  capacity: number | null;
  registeredCount: number;
  createdAt: number;
  registered?: boolean;
}

export interface PoojaBook {
  id: string;
  title: string;
  author: string | null;
  category: string;
  content: string | null;
  pdfUrl: string | null;
  coverImageUrl: string | null;
  createdAt: number;
}

async function authedPost<T>(path: string): Promise<T> {
  const token = localStorage.getItem('auth_access_token');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Something went wrong.');
  return res.json();
}

export const poojaService = {
  listVideos: () => fetch(`${API_URL}/api/pooja/videos`).then(r => r.json()) as Promise<PoojaVideo[]>,
  listSessions: () => fetch(`${API_URL}/api/pooja/sessions`).then(r => r.json()) as Promise<PoojaGroupSession[]>,
  listBooks: () => fetch(`${API_URL}/api/pooja/books`).then(r => r.json()) as Promise<PoojaBook[]>,
  joinSession: (id: string) => authedPost<PoojaGroupSession>(`/api/pooja/sessions/${id}/join`),
};
