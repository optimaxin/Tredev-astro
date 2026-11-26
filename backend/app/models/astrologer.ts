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
  active_offer_percent: number;
  price_increase_old_chat_price: number | null;
  price_increase_old_call_price: number | null;
  price_increase_old_video_price: number | null;
  price_increase_expires_at: string | null;
  // Per-astrologer Boost payout-share override (staff-set) — NULL means
  // "use the platform default" (platform_settings). Internal/staff-only,
  // deliberately never exposed on PublicAstrologerProfile below.
  boost_payout_override_percent: number | null;
  // Staff-set revenue split — what % of the per-minute price this astrologer
  // actually earns (the rest is the platform's cut). Internal/staff-only,
  // never exposed on PublicAstrologerProfile — a client never needs to know
  // another astrologer's commission rate.
  commission_percent: number;
  // Staff-selectable alternative to commission_percent — a flat monthly
  // amount instead of a per-consultation %. Both columns always exist;
  // which one actually applies is decided by payout_model, not by zeroing
  // out the other (switching back to COMMISSION later keeps whatever %
  // was last set instead of forgetting it). Internal/staff-only, same as
  // commission_percent — never exposed on PublicAstrologerProfile.
  payout_model: 'COMMISSION' | 'SALARY';
  monthly_salary: number;
  // Staff-curated review shown on this astrologer's public card (see
  // admin.routes.ts's GET/PATCH /astrologers/:id/featured-review) — null
  // means no card review. Which review this points at is public (it IS the
  // review text, already visible on the full reviews list); only the id
  // itself lives on the row.
  featured_review_id: string | null;
  // Joined in only by the two public-read paths that actually render a card
  // (listAstrologers, findAstrologerById) — present there, undefined on every
  // other fetch (admin edits, realtime self-heal, etc.) that has no reason to
  // pay for the join. Never trust these as "always populated".
  featured_review_text?: string | null;
  featured_review_rating?: number | null;
  featured_review_author_name?: string | null;
  // Persisted online/offline toggle — survives a server restart so an
  // astrologer doesn't silently get flipped back OFFLINE by a deploy or an
  // idle-dyno respawn (see realtimeStore.ts buildAstrologerRecord).
  intent: 'ONLINE' | 'OFFLINE';
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
  activeOfferPercent: number;
  // Only present when the row was fetched via a path that joins it in (see
  // featured_review_* on the row type above) — null either way means
  // "nothing to show", so callers don't need to distinguish the two cases.
  featuredReview: { text: string; rating: number; authorName: string } | null;
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
    activeOfferPercent: row.active_offer_percent,
    featuredReview: row.featured_review_text
      ? { text: row.featured_review_text, rating: row.featured_review_rating ?? row.rating, authorName: row.featured_review_author_name || 'A user' }
      : null,
  };
}
