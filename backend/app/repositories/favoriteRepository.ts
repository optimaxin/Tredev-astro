import { query, queryOne } from '../core/db.ts';
import type { AstrologerCatalogRow } from '../models/astrologer.ts';

export async function addFavorite(userId: string, astrologerId: number) {
  // Idempotent — favoriting an already-favorited astrologer is a no-op, not an error.
  await query(
    'INSERT INTO favorites (user_id, astrologer_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, astrologer_id) DO NOTHING',
    [userId, astrologerId, Date.now()]
  );
}

export async function removeFavorite(userId: string, astrologerId: number) {
  await query('DELETE FROM favorites WHERE user_id = $1 AND astrologer_id = $2', [userId, astrologerId]);
}

export async function isFavorite(userId: string, astrologerId: number): Promise<boolean> {
  const row = await queryOne('SELECT 1 FROM favorites WHERE user_id = $1 AND astrologer_id = $2', [userId, astrologerId]);
  return !!row;
}

export async function listFavoriteAstrologers(userId: string): Promise<AstrologerCatalogRow[]> {
  return query<AstrologerCatalogRow>(
    `SELECT a.* FROM astrologers a
     JOIN favorites f ON f.astrologer_id = a.id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
}
