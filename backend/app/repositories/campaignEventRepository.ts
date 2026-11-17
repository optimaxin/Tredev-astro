import { randomUUID } from 'node:crypto';
import { query } from '../core/db.ts';
import { MAINSTREAM_EMAIL_DOMAINS } from '../core/mainstreamEmailDomains.ts';

const MAINSTREAM_DOMAINS_ARRAY = [...MAINSTREAM_EMAIL_DOMAINS];

// Dev/QA accounts that slipped past the domain filter because they were made
// with real Gmail addresses — matched on the NAME, since that's the only
// thing they reliably share ("Test User", "OTP Test", "Login Bug Test",
// "Signin Test", "qwert", and one developer's several dozen "Sparsh"
// signups). Kept as a list so adding another marker later is one line.
const TEST_ACCOUNT_NAME_PATTERNS = ['%sparsh%', '%test%', '%qwert%', '%dummy%'];

// The only campaign whose visitors are real platform accounts (login
// required before browsing) — see listRegisteredUsers' own comment. Other
// campaigns (Navratri, and any future one) identify visitors through their
// own lightweight onboarding gate instead, with no mainstream-email-domain
// restriction, so that filter only makes sense applied to this one.
const GANESH_CAMPAIGN = 'ganesh-chaturthi';

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
// campaign visitors — plus the name-based test filter above for the ones
// made with real Gmail addresses.
export function listRegisteredUsers(): Promise<RegisteredUserRow[]> {
  return query<RegisteredUserRow>(
    `SELECT name, email, phone_number FROM users
     WHERE split_part(email, '@', 2) = ANY($1::text[])
       AND NOT (name ILIKE ANY($2::text[]))
     ORDER BY name`,
    [MAINSTREAM_DOMAINS_ARRAY, TEST_ACCOUNT_NAME_PATTERNS]
  );
}

export async function logCampaignEvent(eventType: string, eventLabel: string, meta?: Record<string, unknown>, user?: CampaignEventUser, campaign?: string) {
  await query(
    'INSERT INTO campaign_events (id, event_type, event_label, meta, created_at, user_name, user_email, user_phone, campaign) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [randomUUID(), eventType, eventLabel, meta ? JSON.stringify(meta) : null, Date.now(), user?.name || null, user?.email || null, user?.phone || null, campaign || GANESH_CAMPAIGN]
  );
}

// Every campaign that has ever logged an event — powers the dashboard's
// campaign picker. Falls back to just the Ganesh one if the table is
// completely empty rather than showing an empty picker with nothing to pick.
export async function listCampaigns(): Promise<string[]> {
  const rows = await query<{ campaign: string }>(
    `SELECT DISTINCT campaign FROM campaign_events WHERE campaign IS NOT NULL ORDER BY campaign`
  );
  return rows.length ? rows.map(r => r.campaign) : [GANESH_CAMPAIGN];
}

// One query, grouped by (event_type, event_label) — an all-time total with
// no time window at all; the only way this data ever clears is the
// dashboard's explicit "Reset All Data" action (resetCampaignEvents below).
// Scoped to one campaign at a time so two campaigns sharing this table
// (Ganesh, Navratri, ...) don't show up merged into one meaningless total.
export function summarizeCampaignEvents(campaign: string): Promise<CampaignEventSummaryRow[]> {
  return query<CampaignEventSummaryRow>(
    `SELECT event_type, event_label, COUNT(*)::text AS total
     FROM campaign_events
     WHERE campaign = $1
     GROUP BY event_type, event_label
     ORDER BY COUNT(*) DESC`,
    [campaign]
  );
}

// Per-user feature usage — one row per (user, event_type, event_label)
// combination with its count; the dashboard pivots this into a name/email/
// phone + one-column-per-feature table. Only events carrying user_email are
// counted (there shouldn't be many without one, now that every campaign
// identifies visitors up front). The mainstream-email-domain + test-name
// filter only applies to Ganesh Chaturthi, whose visitors are real platform
// accounts (see listRegisteredUsers and GANESH_CAMPAIGN above) — a Navratri
// visitor's email was never required to be @gmail.com/etc, so applying that
// filter there would silently drop real leads.
export function summarizeCampaignEventsByUser(campaign: string): Promise<CampaignEventUserRow[]> {
  const extraFilter = campaign === GANESH_CAMPAIGN
    ? `AND split_part(user_email, '@', 2) = ANY($2::text[]) AND (user_name IS NULL OR NOT (user_name ILIKE ANY($3::text[])))`
    : '';
  const params = campaign === GANESH_CAMPAIGN ? [campaign, MAINSTREAM_DOMAINS_ARRAY, TEST_ACCOUNT_NAME_PATTERNS] : [campaign];
  return query<CampaignEventUserRow>(
    `SELECT user_email, MAX(user_name) AS user_name, MAX(user_phone) AS user_phone,
            event_type, event_label, COUNT(*)::text AS total
     FROM campaign_events
     WHERE campaign = $1 AND user_email IS NOT NULL ${extraFilter}
     GROUP BY user_email, event_type, event_label
     ORDER BY user_email, event_type, event_label`,
    params
  );
}

export async function resetCampaignEvents(campaign: string) {
  await query('DELETE FROM campaign_events WHERE campaign = $1', [campaign]);
}
