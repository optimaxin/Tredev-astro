import { randomUUID } from 'node:crypto';
import { query } from '../core/db.ts';
import { MAINSTREAM_EMAIL_DOMAINS } from '../core/mainstreamEmailDomains.ts';

const MAINSTREAM_DOMAINS_ARRAY = [...MAINSTREAM_EMAIL_DOMAINS];

export interface CampaignEventSummaryRow {
  event_type: string;
  event_label: string;
  total: string; // pg returns COUNT(*) as a string (bigint)
}

export interface CampaignEventUserRow {
  user_email: string;
  user_name: string | null;
  user_phone: string | null;
  event_type: string;
  event_label: string;
  total: string;
}

export interface CampaignEventUser {
  name?: string;
  email?: string;
  phone?: string;
}

export interface RegisteredUserRow {
  name: string;
  email: string;
  phone_number: string | null;
}

// Every registered account on the platform (name/email/phone only — never
// password_hash or anything else sensitive), so the dashboard's per-user
// table can list EVERY user, not just the ones who happened to trigger a
// tracked event. summarizeCampaignEventsByUser below only has rows for
// users with at least one event, which silently dropped anyone who
// registered but never clicked a tracked calculator/wish action.
//
// Restricted to the same mainstream-provider domains signup itself now
// requires (auth.routes.ts) — years of dev/QA testing left hundreds of
// @example.com, @tredevastro.local and similar throwaway accounts in this
// table, which would otherwise flood a dashboard meant to show real
// campaign visitors. Also drops anything named "sparsh" — one developer's
// several dozen real-Gmail-domain test signups, which the domain filter
// above can't catch since they're legitimate gmail.com addresses.
export function listRegisteredUsers(): Promise<RegisteredUserRow[]> {
  return query<RegisteredUserRow>(
    `SELECT name, email, phone_number FROM users
     WHERE split_part(email, '@', 2) = ANY($1::text[])
       AND name NOT ILIKE '%sparsh%'
     ORDER BY name`,
    [MAINSTREAM_DOMAINS_ARRAY]
  );
}

export async function logCampaignEvent(eventType: string, eventLabel: string, meta?: Record<string, unknown>, user?: CampaignEventUser) {
  await query(
    'INSERT INTO campaign_events (id, event_type, event_label, meta, created_at, user_name, user_email, user_phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [randomUUID(), eventType, eventLabel, meta ? JSON.stringify(meta) : null, Date.now(), user?.name || null, user?.email || null, user?.phone || null]
  );
}

// One query, grouped by (event_type, event_label) — an all-time total with
// no time window at all; the only way this data ever clears is the
// dashboard's explicit "Reset All Data" action (resetCampaignEvents below).
export function summarizeCampaignEvents(): Promise<CampaignEventSummaryRow[]> {
  return query<CampaignEventSummaryRow>(
    `SELECT event_type, event_label, COUNT(*)::text AS total
     FROM campaign_events
     GROUP BY event_type, event_label
     ORDER BY COUNT(*) DESC`
  );
}

// Per-user feature usage — one row per (user, event_type, event_label)
// combination with its count; the dashboard pivots this into a name/email/
// phone + one-column-per-feature table. Only events fired after a real
// login carry user_email, so anonymous rows (there shouldn't be many, now
// that login is required before browsing) are simply left out here. Same
// mainstream-domain filter as listRegisteredUsers above, so a dev/test
// account's clicks don't show up here even though listRegisteredUsers no
// longer lists that account either.
export function summarizeCampaignEventsByUser(): Promise<CampaignEventUserRow[]> {
  return query<CampaignEventUserRow>(
    `SELECT user_email, MAX(user_name) AS user_name, MAX(user_phone) AS user_phone,
            event_type, event_label, COUNT(*)::text AS total
     FROM campaign_events
     WHERE user_email IS NOT NULL AND split_part(user_email, '@', 2) = ANY($1::text[])
       AND (user_name IS NULL OR user_name NOT ILIKE '%sparsh%')
     GROUP BY user_email, event_type, event_label
     ORDER BY user_email, event_type, event_label`,
    [MAINSTREAM_DOMAINS_ARRAY]
  );
}

export async function resetCampaignEvents() {
  await query('DELETE FROM campaign_events');
}
