// Thin client for the astrologer discovery/catalog API
// (backend/app/api/astrologers.routes.ts). Adapts the backend's response
// shape into the field names the existing astrologer-display components
// already use, so those components didn't need to change at all.

import { API_URL } from './apiUrl';

export interface ApiAstrologerProfile {
  id: number;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  languages: string[];
  categories: string[];
  expertise: string[];
  consultationTypes: string[];
  chatPrice: number;
  callPrice: number;
  videoPrice: number;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  consultationCount: number;
  activeOfferPercent: number;
}

export interface UiAstrologer {
  id: number;
  name: string;
  title: string;
  rating: number;
  reviews: number;
  experience: number;
  consultations: number;
  languages: string[];
  price: number;
  avatar: string;
  about: string;
  category: string[];
  specialization: string[];
  activeOfferPercent: number;
}

function adapt(p: ApiAstrologerProfile): UiAstrologer {
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    rating: p.rating,
    reviews: p.reviewCount,
    experience: p.experienceYears,
    consultations: p.consultationCount,
    languages: p.languages,
    price: p.chatPrice,
    avatar: p.avatar,
    about: p.bio,
    category: p.categories,
    specialization: p.expertise,
    activeOfferPercent: p.activeOfferPercent,
  };
}

export interface AstrologerListParams {
  category?: string;
  sort?: 'rating' | 'experience' | 'price' | 'relevance';
  page?: number;
  limit?: number;
}

export class AstrologerApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function authedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_access_token');
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new AstrologerApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new AstrologerApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export interface Review {
  id: string;
  astrologerId: number;
  rating: number;
  text: string;
  createdAt: number;
  authorName: string;
}

export const astrologerService = {
  // A logged-in astrologer's own catalog profile (id, pricing, rating) —
  // needed to query their own consultations/reviews/earnings.
  getMyProfile: () => authedRequest<ApiAstrologerProfile>('/api/astrologers/me').then(adapt),

  async list(params: AstrologerListParams = {}): Promise<{ data: UiAstrologer[]; total: number }> {
    const qs = new URLSearchParams();
    if (params.category && params.category !== 'All') qs.set('category', params.category);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const res = await fetch(`${API_URL}/api/astrologers/catalog?${qs.toString()}`);
    const body = await res.json();
    if (!body.success) throw new Error(body.error?.message || 'Failed to load astrologers');
    return { data: (body.data as ApiAstrologerProfile[]).map(adapt), total: body.pagination.total };
  },

  async get(id: number): Promise<UiAstrologer | null> {
    const res = await fetch(`${API_URL}/api/astrologers/catalog/${id}`);
    if (res.status === 404) return null;
    const body = await res.json();
    if (!body.success) throw new Error(body.error?.message || 'Failed to load astrologer');
    return adapt(body.data as ApiAstrologerProfile);
  },

  // Unadapted — the admin edit form needs fields (consultationTypes,
  // callPrice, videoPrice, categories) that UiAstrologer/`adapt` drops.
  async getRaw(id: number): Promise<ApiAstrologerProfile | null> {
    const res = await fetch(`${API_URL}/api/astrologers/catalog/${id}`);
    if (res.status === 404) return null;
    const body = await res.json();
    if (!body.success) throw new Error(body.error?.message || 'Failed to load astrologer');
    return body.data as ApiAstrologerProfile;
  },

  // ── Reviews ──────────────────────────────────────────────────────────
  listReviews: (astrologerId: number) => authedRequest<Review[]>(`/api/astrologers/${astrologerId}/reviews`),
  submitReview: (astrologerId: number, consultationId: string, rating: number, text: string) =>
    authedRequest<Review>(`/api/astrologers/${astrologerId}/reviews`, { method: 'POST', body: JSON.stringify({ consultationId, rating, text }) }),

  // ── Favorites ────────────────────────────────────────────────────────
  isFavorite: (astrologerId: number) => authedRequest<{ favorited: boolean }>(`/api/astrologers/${astrologerId}/favorite`),
  addFavorite: (astrologerId: number) => authedRequest<{ favorited: boolean }>(`/api/astrologers/${astrologerId}/favorite`, { method: 'POST' }),
  removeFavorite: (astrologerId: number) => authedRequest<{ favorited: boolean }>(`/api/astrologers/${astrologerId}/favorite`, { method: 'DELETE' }),
  listFavorites: (): Promise<UiAstrologer[]> =>
    authedRequest<ApiAstrologerProfile[]>('/api/favorites').then(rows => rows.map(adapt)),

  // ── Become an astrologer ─────────────────────────────────────────────
  submitApplication: (expertise: string, experience: string) =>
    authedRequest<{ id: string; status: string }>('/api/astrologers/applications', { method: 'POST', body: JSON.stringify({ expertise, experience }) }),
  myApplication: () => authedRequest<{ id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' } | null>('/api/astrologers/applications/mine'),

  // ── Offers (percentage discounts, astrologer self-service) ──────────
  setMyOffer: (percent: 0 | 20 | 50 | 75) =>
    authedRequest<ApiAstrologerProfile>('/api/astrologers/me/offer', { method: 'PATCH', body: JSON.stringify({ percent }) }),

  // ── Boost (visibility feature, astrologer self-service) ─────────────
  getMyBoost: () => authedRequest<BoostStatus>('/api/astrologers/me/boost'),
  activateMyBoost: () => authedRequest<BoostSummary>('/api/astrologers/me/boost', { method: 'POST' }),

  // The exact price a booking would lock in right now — offer/loyalty
  // adjusted. Works logged-out too (shows the advertised, non-loyal rate).
  getEffectivePrice: (astrologerId: number, type: 'chat' | 'voice' | 'video') =>
    authedRequest<EffectivePrice>(`/api/astrologers/${astrologerId}/effective-price?type=${type}`),
};

export interface EffectivePrice {
  pricePerMin: number;
  appliedOfferPercent: number;
  isLoyal: boolean;
}

export interface BoostSummary {
  id: number;
  displayId: string;
  startedAt: number;
  endsAt: number;
  payoutSharePercent: number;
}

export interface BoostStatus {
  active: BoostSummary | null;
  history: BoostSummary[];
  // What activating right now would pay — this astrologer's own override if
  // staff set one, else the platform default. Shown in the "are you sure?"
  // confirmation before POSTing /me/boost.
  pendingPayoutSharePercent: number;
}
