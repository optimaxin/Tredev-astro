import { randomUUID } from 'node:crypto';
import { query } from '../core/db.ts';

export interface PageViewRow {
  id: string;
  user_id: string;
  path: string;
  created_at: number;
}

export async function recordPageView(userId: string, path: string): Promise<void> {
  await query(
    'INSERT INTO page_views (id, user_id, path, created_at) VALUES ($1, $2, $3, $4)',
    [randomUUID(), userId, path, Date.now()]
  );
}

// Most-recent-first, for the Users drawer's activity trail — not a full
// analytics breakdown, just "what has this account actually opened lately".
export function listPageViewsForUser(userId: string, limit = 25): Promise<PageViewRow[]> {
  return query<PageViewRow>('SELECT * FROM page_views WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
}
