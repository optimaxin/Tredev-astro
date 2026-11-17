import { randomUUID } from 'node:crypto';
import { query, queryOne, withTransaction } from '../core/db.ts';
import type { ReviewRow } from '../models/review.ts';

export function findReviewByConsultation(consultationId: string): Promise<ReviewRow | undefined> {
  return queryOne<ReviewRow>('SELECT * FROM reviews WHERE consultation_id = $1', [consultationId]);
}

export async function listReviewsForAstrologer(astrologerId: number, page: number, limit: number): Promise<{ rows: ReviewRow[]; total: number }> {
  const totalRow = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM reviews WHERE astrologer_id = $1', [astrologerId]);
  const rows = await query<ReviewRow>(
    'SELECT * FROM reviews WHERE astrologer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [astrologerId, limit, (page - 1) * limit]
  );
  return { rows, total: Number(totalRow?.n ?? 0) };
}

// Inserting a review and recomputing the astrologer's aggregate rating must
// be atomic — otherwise a concurrent read between the two steps could see a
// review that isn't reflected in the astrologer's rating yet, or vice versa.
export async function insertReviewAndUpdateRating(params: {
  astrologerId: number; userId: string; consultationId: string; rating: number; text: string;
}): Promise<ReviewRow> {
  return withTransaction(async client => {
    const row: ReviewRow = {
      id: randomUUID(),
      astrologer_id: params.astrologerId,
      user_id: params.userId,
      consultation_id: params.consultationId,
      rating: params.rating,
      text: params.text,
      created_at: Date.now(),
    };
    await query(
      `INSERT INTO reviews (id, astrologer_id, user_id, consultation_id, rating, text, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [row.id, row.astrologer_id, row.user_id, row.consultation_id, row.rating, row.text, row.created_at],
      client
    );
    const agg = await queryOne<{ avg: string; count: string }>(
      'SELECT AVG(rating) AS avg, COUNT(*) AS count FROM reviews WHERE astrologer_id = $1',
      [params.astrologerId],
      client
    );
    await query(
      'UPDATE astrologers SET rating = $1, review_count = $2 WHERE id = $3',
      [Number(agg?.avg ?? 0), Number(agg?.count ?? 0), params.astrologerId],
      client
    );
    return row;
  });
}
