import { query, queryOne, type Executor } from '../core/db.ts';

// A user becomes "Loyal" to a specific astrologer once their combined
// completed-session time with that astrologer exceeds 15 minutes (per the
// Astrologer Offers Feature spec — loyalty is astrologer-specific, not
// platform-wide).
const LOYAL_THRESHOLD_MS = 15 * 60_000;

export interface LoyaltyRow {
  user_email: string;
  astrologer_id: number;
  total_ms: string; // BIGINT comes back as a string
  is_loyal: number;
}

export async function getLoyalty(userEmail: string, astrologerId: number, executor?: Executor): Promise<{ totalMs: number; isLoyal: boolean }> {
  const row = await queryOne<LoyaltyRow>(
    'SELECT * FROM user_astrologer_loyalty WHERE user_email = $1 AND astrologer_id = $2',
    [userEmail.toLowerCase(), astrologerId],
    executor
  );
  return { totalMs: row ? Number(row.total_ms) : 0, isLoyal: !!row?.is_loyal };
}

// Called once a session completes — accumulates its real duration and
// (re)computes whether the threshold has now been crossed. Deliberately NOT
// called mid-session: the spec locks whatever offer/loyalty state applied at
// session START for that session's entire duration (see pricingEngine.ts).
export async function addSessionMinutes(userEmail: string, astrologerId: number, sessionMs: number, executor?: Executor): Promise<void> {
  if (sessionMs <= 0) return;
  const email = userEmail.toLowerCase();
  // Single atomic UPSERT — the increment (sessionMs) and the loyalty
  // re-check both happen in the same statement Postgres evaluates, instead
  // of a separate SELECT-then-compute-in-JS-then-UPDATE (two sessions with
  // the same astrologer ending close together could race that: both read
  // the same starting total_ms, and whichever UPDATE lands last overwrites
  // the other's addition, silently undercounting).
  await query(
    `INSERT INTO user_astrologer_loyalty (user_email, astrologer_id, total_ms, is_loyal)
     VALUES ($1, $2, $3, CASE WHEN $3 > $4 THEN 1 ELSE 0 END)
     ON CONFLICT (user_email, astrologer_id) DO UPDATE SET
       total_ms = user_astrologer_loyalty.total_ms + $3,
       is_loyal = CASE WHEN user_astrologer_loyalty.total_ms + $3 > $4 THEN 1 ELSE 0 END`,
    [email, astrologerId, sessionMs, LOYAL_THRESHOLD_MS],
    executor
  );
}
