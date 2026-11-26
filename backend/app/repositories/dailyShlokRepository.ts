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

// Shuffles the batch staff pastes in one go (see the "Load N Days" drawer in
// DailyShlokPage.tsx) and assigns one per upcoming calendar day, starting
// today — reuses the exact same per-date rows and read path as a single
// manual save (findShlokForDate, called once a day by content.routes.ts's
// /daily-shlok), so "a different shlok shows up every day" just falls out
// of each day already having its own (randomly assigned) row, no separate
// "pick one for today" logic needed.
export async function bulkUpsertShloks(items: { textEn: string; textHi: string }[]): Promise<DailyShlokRow[]> {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const rows: DailyShlokRow[] = [];
  for (let i = 0; i < shuffled.length; i++) {
    const date = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    rows.push(await upsertShlok({ date, textEn: shuffled[i].textEn, textHi: shuffled[i].textHi }));
  }
  return rows;
}
