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
// see where traffic is coming from even before/without a signup. visitorId is
// a random id the frontend generates once and persists in localStorage (see
// trackingService.ts) — it's what lets an anonymous visitor's repeat visits
// from the same device/browser be recognized as "the same lead" in the Leads
// page below, instead of looking like a brand-new stranger every time.
export async function recordPageView(userId: string | null, visitorId: string | null, path: string, ipAddress: string, userAgent: string, country: string | null): Promise<void> {
  await query(
    'INSERT INTO page_views (id, user_id, visitor_id, path, ip_address, user_agent, country, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [randomUUID(), userId, visitorId, path, ipAddress || null, userAgent || null, country, Date.now()]
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

// Registered and anonymous traffic are fetched as two SEPARATE queries
// (not one combined list filtered client-side) — anonymous visits are far
// more frequent, so a single "most recent N overall" query was almost
// entirely anonymous rows, making registered-user traffic look like it
// never showed up even though it was being recorded. Each gets its own
// limit instead of competing for the same slots.
export function listRecentRegisteredPageViews(limit = 50): Promise<RecentPageViewRow[]> {
  return query<RecentPageViewRow>(
    `SELECT pv.*, u.name AS user_name, u.email AS user_email
     FROM page_views pv
     JOIN users u ON u.id = pv.user_id
     ORDER BY pv.created_at DESC LIMIT $1`,
    [limit]
  );
}

export function listRecentAnonymousPageViews(limit = 50): Promise<RecentPageViewRow[]> {
  return query<RecentPageViewRow>(
    `SELECT pv.*, NULL AS user_name, NULL AS user_email
     FROM page_views pv
     WHERE pv.user_id IS NULL
     ORDER BY pv.created_at DESC LIMIT $1`,
    [limit]
  );
}

export interface LeadRow {
  lead_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  // Set only for an anonymous lead (user_id null) that submitted a
  // calculator form — see anon_leads / recordAnonLead below. Null for a
  // registered user (use user_name/user_email instead) and for an anonymous
  // visitor who never submitted a form.
  lead_phone: string | null;
  visit_count: number;
  first_seen: number;
  last_seen: number;
  last_path: string;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
}

// "Leads" — one row per distinct visitor, registered or anonymous, instead
// of one row per page view. An anonymous visitor is grouped by visitor_id
// (the sticky device id from trackingService.ts), so a repeat visit from the
// same browser shows up as more activity on the SAME lead rather than a new
// anonymous stranger each time. Rows with neither a user_id nor a visitor_id
// (pings from before this migration) are excluded — there's nothing to group
// them by. user_name/user_email fall back to anon_leads (name/email an
// anonymous visitor typed into a calculator form — see recordAnonLead) when
// there's no logged-in account to pull them from.
export function listLeads(limit = 100): Promise<LeadRow[]> {
  return query<LeadRow>(
    `SELECT
       COALESCE(pv.user_id, pv.visitor_id) AS lead_id,
       pv.user_id,
       COALESCE(u.name, al.name) AS user_name,
       COALESCE(u.email, al.email) AS user_email,
       al.phone AS lead_phone,
       COUNT(*)::int AS visit_count,
       MIN(pv.created_at) AS first_seen,
       MAX(pv.created_at) AS last_seen,
       (ARRAY_AGG(pv.path ORDER BY pv.created_at DESC))[1] AS last_path,
       (ARRAY_AGG(pv.ip_address ORDER BY pv.created_at DESC))[1] AS ip_address,
       (ARRAY_AGG(pv.user_agent ORDER BY pv.created_at DESC))[1] AS user_agent,
       (ARRAY_AGG(pv.country ORDER BY pv.created_at DESC))[1] AS country
     FROM page_views pv
     LEFT JOIN users u ON u.id = pv.user_id
     LEFT JOIN anon_leads al ON al.visitor_id = pv.visitor_id AND pv.user_id IS NULL
     WHERE pv.user_id IS NOT NULL OR pv.visitor_id IS NOT NULL
     GROUP BY COALESCE(pv.user_id, pv.visitor_id), pv.user_id, u.name, u.email, al.name, al.email, al.phone
     ORDER BY MAX(pv.created_at) DESC
     LIMIT $1`,
    [limit]
  );
}

// Upserts the name/email/phone an anonymous visitor typed into a calculator
// form (BirthDetailsForm — see trackingService.ts's `lead()`), keyed by their
// sticky visitor_id. Called only for visitors with no logged-in account;
// a registered user's details already come from `users` via listLeads above.
export async function recordAnonLead(visitorId: string, name: string, email: string, phone: string | null, source: string): Promise<void> {
  const now = Date.now();
  await query(
    `INSERT INTO anon_leads (visitor_id, name, email, phone, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (visitor_id) DO UPDATE SET name = $2, email = $3, phone = $4, source = $5, updated_at = $6`,
    [visitorId, name, email, phone, source, now]
  );
}
