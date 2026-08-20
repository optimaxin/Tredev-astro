import { query, queryOne } from '../core/db.ts';
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
  const limitParam = addParam(filters.limit);
  const offsetParam = addParam(offset);
  const rows = await query<AstrologerCatalogRow>(
    `SELECT * FROM astrologers WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  return { rows, total };
}

export async function updateMaxConcurrent(id: number, maxConcurrent: number) {
  await query('UPDATE astrologers SET max_concurrent = $1 WHERE id = $2', [maxConcurrent, id]);
}

export function findAstrologerById(id: number): Promise<AstrologerCatalogRow | undefined> {
  return queryOne<AstrologerCatalogRow>('SELECT * FROM astrologers WHERE id = $1 AND is_active = 1', [id]);
}

// Used by realtimeStore.ts to seed its in-memory live state — includes
// inactive rows too, since "inactive" is a catalog-visibility concern, not a
// reason to drop an astrologer from the live availability engine.
export function listAllAstrologersRaw(): Promise<AstrologerCatalogRow[]> {
  return query<AstrologerCatalogRow>('SELECT * FROM astrologers');
}
