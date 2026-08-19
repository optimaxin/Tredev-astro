import { db } from '../core/db.ts';
import type { AstrologerCatalogRow } from '../models/astrologer.ts';

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
// the JSON-encoded text column — good enough for SQLite with a handful of
// rows. Once this moves to Postgres, switch these columns to real arrays and
// filter with the `@>` containment operator instead.
export function listAstrologers(filters: AstrologerFilters): { rows: AstrologerCatalogRow[]; total: number } {
  const where: string[] = ['is_active = 1'];
  const params: Record<string, string | number> = {};

  if (filters.category) { where.push('categories LIKE @category'); params.category = `%"${filters.category}"%`; }
  if (filters.language) { where.push('languages LIKE @language'); params.language = `%"${filters.language}"%`; }
  if (filters.consultationType) { where.push('consultation_types LIKE @consultationType'); params.consultationType = `%"${filters.consultationType}"%`; }
  if (filters.minRating !== undefined) { where.push('rating >= @minRating'); params.minRating = filters.minRating; }
  if (filters.minPrice !== undefined) { where.push('chat_price >= @minPrice'); params.minPrice = filters.minPrice; }
  if (filters.maxPrice !== undefined) { where.push('chat_price <= @maxPrice'); params.maxPrice = filters.maxPrice; }

  const whereSql = where.join(' AND ');
  const orderBy = SORT_COLUMN[filters.sort || 'relevance'];

  const total = (db.prepare(`SELECT COUNT(*) AS n FROM astrologers WHERE ${whereSql}`).get(params) as { n: number }).n;

  const offset = (filters.page - 1) * filters.limit;
  const rows = db
    .prepare(`SELECT * FROM astrologers WHERE ${whereSql} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: filters.limit, offset }) as unknown as AstrologerCatalogRow[];

  return { rows, total };
}

export function updateMaxConcurrent(id: number, maxConcurrent: number) {
  db.prepare('UPDATE astrologers SET max_concurrent = ? WHERE id = ?').run(maxConcurrent, id);
}

export function findAstrologerById(id: number): AstrologerCatalogRow | undefined {
  return db.prepare('SELECT * FROM astrologers WHERE id = ? AND is_active = 1').get(id) as AstrologerCatalogRow | undefined;
}

// Used by realtimeStore.ts to seed its in-memory live state — includes
// inactive rows too, since "inactive" is a catalog-visibility concern, not a
// reason to drop an astrologer from the live availability engine.
export function listAllAstrologersRaw(): AstrologerCatalogRow[] {
  return db.prepare('SELECT * FROM astrologers').all() as unknown as AstrologerCatalogRow[];
}
