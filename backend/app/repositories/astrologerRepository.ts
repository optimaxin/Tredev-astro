import { query, queryOne } from '../core/db.ts';
import type { AstrologerCatalogRow } from '../models/astrologer.ts';

// Used when approving an astrologer application — turns a real user account
// into a bookable catalog entry. Starts with zero rating/reviews/experience
// since there's no real history yet; the astrologer/admin can fill in bio,
// pricing, etc. later (a "complete your profile" flow is a natural follow-up,
// not built here).
export async function insertAstrologerForUser(userId: string, name: string, expertise: string): Promise<AstrologerCatalogRow> {
  const maxIdRow = await queryOne<{ max: number | null }>('SELECT MAX(id) AS max FROM astrologers');
  const id = (maxIdRow?.max ?? 0) + 1;
  const row: AstrologerCatalogRow = {
    id,
    name,
    title: 'Astrologer',
    bio: '',
    avatar: '',
    languages: '[]',
    categories: JSON.stringify([expertise]),
    expertise: JSON.stringify([expertise]),
    consultation_types: JSON.stringify(['chat', 'voice', 'video']),
    chat_price: 0,
    call_price: 0,
    video_price: 0,
    rating: 0,
    review_count: 0,
    experience_years: 0,
    consultation_count: 0,
    max_concurrent: 1,
    is_active: 1,
    created_at: Date.now(),
    user_id: userId,
    active_offer_percent: 0,
    price_increase_old_chat_price: null,
    price_increase_old_call_price: null,
    price_increase_old_video_price: null,
    price_increase_expires_at: null,
    boost_payout_override_percent: null,
  };
  await query(
    `INSERT INTO astrologers
      (id, name, title, bio, avatar, languages, categories, expertise, consultation_types,
       chat_price, call_price, video_price, rating, review_count, experience_years, consultation_count,
       max_concurrent, is_active, created_at, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
    [row.id, row.name, row.title, row.bio, row.avatar, row.languages, row.categories, row.expertise, row.consultation_types,
      row.chat_price, row.call_price, row.video_price, row.rating, row.review_count, row.experience_years, row.consultation_count,
      row.max_concurrent, row.is_active, row.created_at, row.user_id]
  );
  return row;
}

export function findAstrologerByUserId(userId: string): Promise<AstrologerCatalogRow | undefined> {
  return queryOne<AstrologerCatalogRow>('SELECT * FROM astrologers WHERE user_id = $1', [userId]);
}

// Staff-set per-astrologer Boost payout-share override — null clears it,
// falling back to the platform default (see boostRepository.ts's
// activateBoost and platformSettingsRepository.ts).
export async function updateBoostPayoutOverride(id: number, percent: number | null): Promise<AstrologerCatalogRow | undefined> {
  const rows = await query<AstrologerCatalogRow>('UPDATE astrologers SET boost_payout_override_percent = $1 WHERE id = $2 RETURNING *', [percent, id]);
  return rows[0];
}

export interface AstrologerFilters {
  category?: string;
  language?: string;
  consultationType?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'rating' | 'experience' | 'price' | 'relevance';
  page: number;
  limit: number;
}

const SORT_COLUMN: Record<string, string> = {
  rating: 'rating DESC',
  experience: 'experience_years DESC',
  price: 'chat_price ASC',
  relevance: 'rating DESC, review_count DESC', // no search term yet, so relevance ~= rating+popularity
};

// ponytail: category/language/consultationType filters use a LIKE match on
// the JSON-encoded text column — fine for a handful of rows. A bigger
// catalog should switch these to real Postgres array columns and filter
// with the `@>` containment operator instead.
export async function listAstrologers(filters: AstrologerFilters): Promise<{ rows: AstrologerCatalogRow[]; total: number }> {
  const where: string[] = ['is_active = 1'];
  const params: (string | number)[] = [];
  const addParam = (value: string | number) => { params.push(value); return `$${params.length}`; };

  if (filters.category) where.push(`categories LIKE ${addParam(`%"${filters.category}"%`)}`);
  if (filters.language) where.push(`languages LIKE ${addParam(`%"${filters.language}"%`)}`);
  if (filters.consultationType) where.push(`consultation_types LIKE ${addParam(`%"${filters.consultationType}"%`)}`);
  if (filters.minRating !== undefined) where.push(`rating >= ${addParam(filters.minRating)}`);
  if (filters.minPrice !== undefined) where.push(`chat_price >= ${addParam(filters.minPrice)}`);
  if (filters.maxPrice !== undefined) where.push(`chat_price <= ${addParam(filters.maxPrice)}`);

  const whereSql = where.join(' AND ');
  const orderBy = SORT_COLUMN[filters.sort || 'relevance'];

  const totalRow = await queryOne<{ n: string }>(`SELECT COUNT(*) AS n FROM astrologers WHERE ${whereSql}`, params);
  const total = Number(totalRow?.n ?? 0);

  const offset = (filters.page - 1) * filters.limit;
  // Boost's whole point is visibility — an astrologer with a currently
  // active Boost ranks first regardless of the chosen sort, ahead of the
  // normal order-by. Not exposed as a column: the spec is explicit that a
  // Boost must never be visible to (or otherwise affect) users, only rank
  // them higher within whatever view they're already looking at.
  const nowParam = addParam(Date.now());
  const limitParam = addParam(filters.limit);
  const offsetParam = addParam(offset);
  const rows = await query<AstrologerCatalogRow>(
    `SELECT * FROM astrologers WHERE ${whereSql}
     ORDER BY (EXISTS (SELECT 1 FROM boosts b WHERE b.astrologer_id = astrologers.id AND b.ends_at > ${nowParam})) DESC, ${orderBy}
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  return { rows, total };
}

export async function updateMaxConcurrent(id: number, maxConcurrent: number) {
  await query('UPDATE astrologers SET max_concurrent = $1 WHERE id = $2', [maxConcurrent, id]);
}

export interface AstrologerProfilePatch {
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
  experienceYears: number;
}

const PRICE_INCREASE_WINDOW_MS = 30 * 24 * 60 * 60_000;

// The "complete your profile" follow-up insertAstrologerForUser's own
// comment already flagged as not built yet — title/bio/languages/pricing/
// experience were only ever set once at creation (or left at their zero
// defaults) with no way to change them afterward. `name` is deliberately
// not editable here: it mirrors the linked user account's name, which
// AstrologersPage.tsx's admin UI matches catalog rows to accounts by.
//
// Also detects a price increase on any of the 3 per-type prices and, per
// the Astrologer Offers Feature spec, grandfathers the OLD price for 30
// days (a "Price Increase Offer" — auto-activated, not astrologer-toggled).
// If one is already running, a further increase during that window doesn't
// reset the grandfathered baseline — only the first increase's old price is
// protected until it expires.
export async function updateAstrologerProfile(id: number, patch: AstrologerProfilePatch): Promise<AstrologerCatalogRow | undefined> {
  const before = await findAstrologerByIdRaw(id);
  if (!before) return undefined;

  const now = Date.now();
  const increaseActive = before.price_increase_expires_at != null && now < Number(before.price_increase_expires_at);
  let oldChat = before.price_increase_old_chat_price;
  let oldCall = before.price_increase_old_call_price;
  let oldVideo = before.price_increase_old_video_price;
  let expiresAt = before.price_increase_expires_at;

  // Only a genuine prior price (>0) can be "increased" — going from an
  // unset/placeholder 0 to a real price for the first time is profile setup,
  // not a price hike, and shouldn't grandfather ₹0 as a protected rate.
  const chatIncreased = before.chat_price > 0 && patch.chatPrice > before.chat_price;
  const callIncreased = before.call_price > 0 && patch.callPrice > before.call_price;
  const videoIncreased = before.video_price > 0 && patch.videoPrice > before.video_price;
  if ((chatIncreased || callIncreased || videoIncreased) && !increaseActive) {
    oldChat = before.chat_price;
    oldCall = before.call_price;
    oldVideo = before.video_price;
    expiresAt = String(now + PRICE_INCREASE_WINDOW_MS);
  }

  const rows = await query<AstrologerCatalogRow>(
    `UPDATE astrologers SET
       title = $1, bio = $2, avatar = $3, languages = $4, categories = $5, expertise = $6,
       consultation_types = $7, chat_price = $8, call_price = $9, video_price = $10, experience_years = $11,
       price_increase_old_chat_price = $12, price_increase_old_call_price = $13, price_increase_old_video_price = $14,
       price_increase_expires_at = $15
     WHERE id = $16
     RETURNING *`,
    [
      patch.title, patch.bio, patch.avatar, JSON.stringify(patch.languages), JSON.stringify(patch.categories), JSON.stringify(patch.expertise),
      JSON.stringify(patch.consultationTypes), patch.chatPrice, patch.callPrice, patch.videoPrice, patch.experienceYears,
      oldChat, oldCall, oldVideo, expiresAt, id,
    ]
  );
  return rows[0];
}

// Astrologer self-service: turn a percentage offer on/off. Validation
// (₹10-floor per tier) happens in the route via pricingEngine's
// canActivateOffer, using this row's CURRENT prices.
export async function setActiveOfferPercent(id: number, percent: number): Promise<AstrologerCatalogRow | undefined> {
  const rows = await query<AstrologerCatalogRow>(
    'UPDATE astrologers SET active_offer_percent = $1 WHERE id = $2 RETURNING *',
    [percent, id]
  );
  return rows[0];
}

// Called when an account stops being an Astrologer (admin.routes.ts's
// PATCH /users/:id/role) — is_active is the same flag listAstrologers'
// public catalog query already filters on, so this is what actually takes
// them out of the bookable listing; demoting the user's role alone would
// leave a now-orphaned catalog row still publicly listed.
export async function deactivateAstrologerByUserId(userId: string): Promise<void> {
  await query('UPDATE astrologers SET is_active = 0 WHERE user_id = $1', [userId]);
}

export function findAstrologerById(id: number): Promise<AstrologerCatalogRow | undefined> {
  return queryOne<AstrologerCatalogRow>('SELECT * FROM astrologers WHERE id = $1 AND is_active = 1', [id]);
}

// Unlike findAstrologerById, doesn't filter on is_active — for resolving a
// name against a *past* consultation/review, where the astrologer might have
// since gone inactive but the historical record should still show correctly.
export function findAstrologerByIdRaw(id: number): Promise<AstrologerCatalogRow | undefined> {
  return queryOne<AstrologerCatalogRow>('SELECT * FROM astrologers WHERE id = $1', [id]);
}

// Used by realtimeStore.ts to seed its in-memory live state — includes
// inactive rows too, since "inactive" is a catalog-visibility concern, not a
// reason to drop an astrologer from the live availability engine.
export function listAllAstrologersRaw(): Promise<AstrologerCatalogRow[]> {
  return query<AstrologerCatalogRow>('SELECT * FROM astrologers');
}
