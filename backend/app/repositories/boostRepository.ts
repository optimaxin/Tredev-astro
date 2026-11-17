import { query, queryOne, type Executor } from '../core/db.ts';
import { getBoostPayoutSharePercent } from './platformSettingsRepository.ts';

const BOOST_WINDOW_MS = 30 * 60_000;
const WAITLIST_ELIGIBILITY_MS = 7 * 24 * 60 * 60_000;

export interface BoostRow {
  id: number;
  astrologer_id: number;
  started_at: string;
  ends_at: string;
  payout_share_percent: number;
}

export interface BoostAttributionRow {
  id: number;
  boost_id: number;
  astrologer_id: number;
  user_email: string;
  expires_at: string;
  consumed_consultation_id: string | null;
}

// "B" + zero-padded id, e.g. "B000042" — the display id shown in Boost
// History / My Sessions, per the spec.
export function boostDisplayId(id: number): string {
  return `B${String(id).padStart(6, '0')}`;
}

export async function getActiveBoost(astrologerId: number, executor?: Executor): Promise<BoostRow | undefined> {
  return queryOne<BoostRow>(
    'SELECT * FROM boosts WHERE astrologer_id = $1 AND ends_at > $2 ORDER BY started_at DESC LIMIT 1',
    [astrologerId, Date.now()],
    executor
  );
}

// An astrologer can't stack a second Boost on top of an already-running one.
// The payout share is this astrologer's own override if staff set one
// (astrologers.boost_payout_override_percent), else the platform default
// (platform_settings, staff-configurable via admin.routes.ts's
// /settings/boost-payout) — and it's locked into this row either way: a
// later change to either setting never retroactively changes an
// already-activated Boost's share, same "lock at creation" rule
// pricingEngine.ts uses for offer/loyalty pricing.
export async function activateBoost(astrologerId: number, overridePayoutSharePercent?: number | null): Promise<BoostRow> {
  const active = await getActiveBoost(astrologerId);
  if (active) throw new Error('A Boost is already active for this astrologer');
  const now = Date.now();
  const payoutSharePercent = overridePayoutSharePercent ?? await getBoostPayoutSharePercent();
  const rows = await query<BoostRow>(
    `INSERT INTO boosts (astrologer_id, started_at, ends_at, payout_share_percent)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [astrologerId, now, now + BOOST_WINDOW_MS, payoutSharePercent]
  );
  return rows[0]!;
}

export async function listBoostHistory(astrologerId: number): Promise<BoostRow[]> {
  return query<BoostRow>('SELECT * FROM boosts WHERE astrologer_id = $1 ORDER BY started_at DESC', [astrologerId]);
}

// Called when a user joins the waitlist (queue) while a Boost is active —
// grants that user 7-day Boost eligibility with THIS astrologer, consumed by
// whichever of their sessions actually starts first within that window.
export async function grantWaitlistAttribution(boostId: number, astrologerId: number, userEmail: string, executor?: Executor): Promise<void> {
  await query(
    `INSERT INTO boost_attributions (boost_id, astrologer_id, user_email, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [boostId, astrologerId, userEmail.toLowerCase(), Date.now() + WAITLIST_ELIGIBILITY_MS],
    executor
  );
}

// Looks for an unconsumed, unexpired waitlist-eligibility grant for this
// (user, astrologer) pair — the oldest one first (FIFO), so an eligibility
// window isn't skipped by a later one.
export async function findUnconsumedAttribution(astrologerId: number, userEmail: string, executor?: Executor): Promise<BoostAttributionRow | undefined> {
  return queryOne<BoostAttributionRow>(
    `SELECT * FROM boost_attributions
     WHERE astrologer_id = $1 AND user_email = $2 AND consumed_consultation_id IS NULL AND expires_at > $3
     ORDER BY expires_at ASC LIMIT 1`,
    [astrologerId, userEmail.toLowerCase(), Date.now()],
    executor
  );
}

export async function consumeAttribution(attributionId: number, consultationId: string, executor?: Executor): Promise<void> {
  await query('UPDATE boost_attributions SET consumed_consultation_id = $1 WHERE id = $2', [consultationId, attributionId], executor);
}

export async function getBoostById(id: number): Promise<BoostRow | undefined> {
  return queryOne<BoostRow>('SELECT * FROM boosts WHERE id = $1', [id]);
}
