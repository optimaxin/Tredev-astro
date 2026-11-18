import { randomUUID } from 'node:crypto';
import { query } from '../core/db.ts';

export interface PageViewRow {
  id: string;
  user_id: string | null;
  path: string;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  created_at: number;
}

// userId is null for an anonymous visitor — still logged, so staff/admin can
// see where traffic is coming from even before/without a signup.
export async function recordPageView(userId: string | null, path: string, ipAddress: string, userAgent: string, country: string | null): Promise<void> {
  await query(
    'INSERT INTO page_views (id, user_id, path, ip_address, user_agent, country, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [randomUUID(), userId, path, ipAddress || null, userAgent || null, country, Date.now()]
  );
}

// Most-recent-first, for the Users drawer's activity trail — not a full
// analytics breakdown, just "what has this account actually opened lately,
// and from what fingerprint".
export function listPageViewsForUser(userId: string, limit = 25): Promise<PageViewRow[]> {
  return query<PageViewRow>('SELECT * FROM page_views WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
}

export interface RecentPageViewRow extends PageViewRow {
  user_name: string | null;
  user_email: string | null;
}

// Site-wide traffic feed (logged-in AND anonymous) for the admin Overview
// page's "Recent Traffic" panel — a left join so an anonymous visit (no
// user_id) still comes back with null name/email instead of being excluded.
export function listRecentPageViews(limit = 50): Promise<RecentPageViewRow[]> {
  return query<RecentPageViewRow>(
    `SELECT pv.*, u.name AS user_name, u.email AS user_email
     FROM page_views pv
     LEFT JOIN users u ON u.id = pv.user_id
     ORDER BY pv.created_at DESC LIMIT $1`,
    [limit]
  );
}
