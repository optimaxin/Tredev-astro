import { randomUUID } from 'node:crypto';
import { query } from '../core/db.ts';

export interface CampaignEventSummaryRow {
  event_type: string;
  event_label: string;
  total: string; // pg returns COUNT(*) as a string (bigint)
  last_24h: string;
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

export async function logCampaignEvent(eventType: string, eventLabel: string, meta?: Record<string, unknown>, user?: CampaignEventUser) {
  await query(
    'INSERT INTO campaign_events (id, event_type, event_label, meta, created_at, user_name, user_email, user_phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [randomUUID(), eventType, eventLabel, meta ? JSON.stringify(meta) : null, Date.now(), user?.name || null, user?.email || null, user?.phone || null]
  );
}

// One query, grouped by (event_type, event_label) — both the all-time total
// and a rolling last-24h count, so the dashboard can show "what's popular
// overall" next to "what's happening right now" without a second round trip.
export function summarizeCampaignEvents(): Promise<CampaignEventSummaryRow[]> {
  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  return query<CampaignEventSummaryRow>(
    `SELECT event_type, event_label,
            COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE created_at >= $1)::text AS last_24h
     FROM campaign_events
     GROUP BY event_type, event_label
     ORDER BY COUNT(*) DESC`,
    [since24h]
  );
}

// Per-user feature usage — one row per (user, event_type, event_label)
// combination with its count; the dashboard pivots this into a name/email/
// phone + one-column-per-feature table. Only events fired after a real
// login carry user_email, so anonymous rows (there shouldn't be many, now
// that login is required before browsing) are simply left out here.
export function summarizeCampaignEventsByUser(): Promise<CampaignEventUserRow[]> {
  return query<CampaignEventUserRow>(
    `SELECT user_email, MAX(user_name) AS user_name, MAX(user_phone) AS user_phone,
            event_type, event_label, COUNT(*)::text AS total
     FROM campaign_events
     WHERE user_email IS NOT NULL
     GROUP BY user_email, event_type, event_label
     ORDER BY user_email, event_type, event_label`
  );
}

export async function resetCampaignEvents() {
  await query('DELETE FROM campaign_events');
}
