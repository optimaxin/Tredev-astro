// Thin client for the astrologer discovery/catalog API
// (backend/app/api/astrologers.routes.ts). Adapts the backend's response
// shape into the field names the existing astrologer-display components
// already use, so those components didn't need to change at all.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ApiAstrologerProfile {
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
  };
}

export interface AstrologerListParams {
  category?: string;
  sort?: 'rating' | 'experience' | 'price' | 'relevance';
  page?: number;
  limit?: number;
}

export const astrologerService = {
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
};
