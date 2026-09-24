import { query, queryOne } from '../core/db.ts';
import type { DailyShlokRow } from '../models/dailyShlok.ts';

export function findShlokForDate(date: string): Promise<DailyShlokRow | undefined> {
  return queryOne<DailyShlokRow>('SELECT * FROM daily_shlok WHERE shlok_date = $1', [date]);
}

// Newest date first, future dates included — the staff page is mostly used
// to queue the next few days, so those belong at the top rather than buried
// under every past entry.
export function listShloks(limit: number): Promise<DailyShlokRow[]> {
  return query<DailyShlokRow>('SELECT * FROM daily_shlok ORDER BY shlok_date DESC LIMIT $1', [limit]);
}

// Upsert, not insert: editing an existing day and queueing a new one are
// the same action from the staff page's point of view, and a date can only
// ever have one shlok.
export async function upsertShlok(params: { date: string; textEn: string; textHi: string }): Promise<DailyShlokRow> {
  const now = Date.now();
  const row = await queryOne<DailyShlokRow>(
    `INSERT INTO daily_shlok (shlok_date, text_en, text_hi, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (shlok_date) DO UPDATE SET text_en = $2, text_hi = $3, updated_at = $4
     RETURNING *`,
    [params.date, params.textEn, params.textHi, now]
  );
  return row!;
}

export async function deleteShlok(date: string) {
  await query('DELETE FROM daily_shlok WHERE shlok_date = $1', [date]);
}
