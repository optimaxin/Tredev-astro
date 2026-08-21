export interface AstrologerCatalogRow {
  id: number;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  languages: string;          // JSON-encoded string[]
  categories: string;         // JSON-encoded string[]
  expertise: string;          // JSON-encoded string[]
  consultation_types: string; // JSON-encoded string[]
  chat_price: number;
  call_price: number;
  video_price: number;
  rating: number;
  review_count: number;
  experience_years: number;
  consultation_count: number;
  max_concurrent: number;
  is_active: number; // SQLite has no boolean type
  created_at: number;
  user_id: string | null;
}

// Public-safe astrologer profile — section 10: no phone/email/internal
// earnings/availability internals, only what a user is allowed to see.
export interface PublicAstrologerProfile {
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

export function toPublicAstrologerProfile(row: AstrologerCatalogRow): PublicAstrologerProfile {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    avatar: row.avatar,
    languages: JSON.parse(row.languages),
    categories: JSON.parse(row.categories),
    expertise: JSON.parse(row.expertise),
    consultationTypes: JSON.parse(row.consultation_types),
    chatPrice: row.chat_price,
    callPrice: row.call_price,
    videoPrice: row.video_price,
    rating: row.rating,
    reviewCount: row.review_count,
    experienceYears: row.experience_years,
    consultationCount: row.consultation_count,
  };
}
