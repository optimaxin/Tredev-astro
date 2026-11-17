import { query, queryOne, type Executor } from '../core/db.ts';
import type { Consultation, ConsultationStatus, ConsultationType } from '../models/types.ts';

interface ConsultationDbRow {
  id: string;
  astrologer_id: number;
  user_email: string;
  user_name: string;
  category: string;
  type: string;
  status: string;
  from_queue: number;
  request_id: string;
  created_at: string; // BIGINT comes back as a string from node-postgres
  accepted_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number;
  extended_minutes: number;
  price_per_min: number;
  applied_offer_percent: number;
  boost_id: number | null;
}

function fromRow(row: ConsultationDbRow): Consultation {
  return {
    id: row.id,
    astrologerId: row.astrologer_id,
    userEmail: row.user_email,
    userName: row.user_name,
    category: row.category,
    type: row.type as ConsultationType,
    status: row.status as ConsultationStatus,
    fromQueue: !!row.from_queue,
    requestId: row.request_id,
    createdAt: Number(row.created_at),
    acceptedAt: row.accepted_at ? Number(row.accepted_at) : undefined,
    startedAt: row.started_at ? Number(row.started_at) : undefined,
    endedAt: row.ended_at ? Number(row.ended_at) : undefined,
    durationMinutes: row.duration_minutes,
    extendedMinutes: row.extended_minutes,
    pricePerMin: row.price_per_min,
    appliedOfferPercent: row.applied_offer_percent,
    boostId: row.boost_id ?? undefined,
  };
}

// Accepts an optional `executor` (a transaction client) — requestConsultation
// in realtimeStore.ts calls this from inside a locked transaction so the
// capacity check and the insert are atomic together (see db.ts's
// withTransaction comment for why that lock is now required at all).
export async function insertConsultation(c: Consultation, executor?: Executor) {
  await query(
    `INSERT INTO consultations
      (id, astrologer_id, user_email, user_name, category, type, status, from_queue, request_id, created_at, accepted_at, started_at, ended_at, duration_minutes, extended_minutes, price_per_min, applied_offer_percent, boost_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      c.id, c.astrologerId, c.userEmail.toLowerCase(), c.userName, c.category, c.type, c.status,
      c.fromQueue ? 1 : 0, c.requestId, c.createdAt, c.acceptedAt ?? null, c.startedAt ?? null, c.endedAt ?? null,
      c.durationMinutes, c.extendedMinutes, c.pricePerMin, c.appliedOfferPercent, c.boostId ?? null,
    ],
    executor
  );
}

export async function updateConsultation(c: Consultation) {
  await query(
    'UPDATE consultations SET status = $1, accepted_at = $2, started_at = $3, ended_at = $4, duration_minutes = $5, extended_minutes = $6 WHERE id = $7',
    [c.status, c.acceptedAt ?? null, c.startedAt ?? null, c.endedAt ?? null, c.durationMinutes, c.extendedMinutes, c.id]
  );
}

export async function findConsultationById(id: string): Promise<Consultation | undefined> {
  const row = await queryOne<ConsultationDbRow>('SELECT * FROM consultations WHERE id = $1', [id]);
  return row ? fromRow(row) : undefined;
}

// For rescheduling expiry timers on server boot — timers are in-memory
// (see realtimeStore.ts's expiryTimers map) so they don't survive a
// restart on their own; any consultation still ACTIVE needs a fresh one.
export async function listActiveConsultations(): Promise<Consultation[]> {
  const rows = await query<ConsultationDbRow>(`SELECT * FROM consultations WHERE status = 'ACTIVE'`);
  return rows.map(fromRow);
}

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'ACTIVE'];

export async function countActiveForAstrologer(astrologerId: number, executor?: Executor): Promise<number> {
  const row = await queryOne<{ n: string }>(
    `SELECT COUNT(*) AS n FROM consultations WHERE astrologer_id = $1 AND status = ANY($2::text[])`,
    [astrologerId, ACTIVE_STATUSES],
    executor
  );
  return Number(row?.n ?? 0);
}

export async function findActiveOrAcceptedForAstrologer(astrologerId: number): Promise<Consultation | undefined> {
  const row = await queryOne<ConsultationDbRow>(
    `SELECT * FROM consultations WHERE astrologer_id = $1 AND status IN ('ACCEPTED', 'ACTIVE') LIMIT 1`,
    [astrologerId]
  );
  return row ? fromRow(row) : undefined;
}

export async function findAssignedForAstrologer(astrologerId: number): Promise<Consultation[]> {
  const rows = await query<ConsultationDbRow>(`SELECT * FROM consultations WHERE astrologer_id = $1 AND status = 'ASSIGNED'`, [astrologerId]);
  return rows.map(fromRow);
}

export async function findLatestForUser(userEmail: string): Promise<Consultation | undefined> {
  const row = await queryOne<ConsultationDbRow>(
    'SELECT * FROM consultations WHERE user_email = $1 ORDER BY created_at DESC LIMIT 1',
    [userEmail.toLowerCase()]
  );
  return row ? fromRow(row) : undefined;
}

export async function findAllForUser(userEmail: string): Promise<Consultation[]> {
  const rows = await query<ConsultationDbRow>(
    'SELECT * FROM consultations WHERE user_email = $1 ORDER BY created_at DESC',
    [userEmail.toLowerCase()]
  );
  return rows.map(fromRow);
}

export async function findAllForAstrologer(astrologerId: number): Promise<Consultation[]> {
  const rows = await query<ConsultationDbRow>(
    'SELECT * FROM consultations WHERE astrologer_id = $1 ORDER BY created_at DESC',
    [astrologerId]
  );
  return rows.map(fromRow);
}

export async function countForUser(userEmail: string): Promise<number> {
  const row = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM consultations WHERE user_email = $1', [userEmail.toLowerCase()]);
  return Number(row?.n ?? 0);
}

// "In flight" — this app only ever books immediate real-time consultations
// (no scheduled-for-later slots), so this is the closest real equivalent to
// the old mock's "today's consultations" KPI.
// Grouped by astrologer + type — sums each session's OWN locked price_per_min
// (set once at session creation by pricingEngine.ts, reflecting whatever
// offer/loyalty/Boost applied at the time) rather than the astrologer's
// current catalog price, so the admin revenue breakdown actually reflects
// offers/discounts instead of ignoring them. Only COMPLETED consultations
// count — an assigned-then-declined/cancelled one was never delivered.
// `revenue` is the gross figure (what users paid, summed) — unchanged
// methodology. `astrologerPayout` additionally applies each boost-attributed
// session's own LOCKED payout_share_percent (see boostRepository.ts's
// activateBoost) on top of that; a non-boosted session pays the astrologer
// its full price_per_min, since there's no general platform-commission model
// for ordinary sessions — only Boost carries an explicit revenue split.
export async function countCompletedByAstrologerAndType(): Promise<{ astrologerId: number; type: string; count: number; revenue: number; astrologerPayout: number }[]> {
  const rows = await query<{ astrologer_id: number; type: string; n: string; revenue: string; astrologer_payout: string }>(
    `SELECT c.astrologer_id, c.type, COUNT(*) AS n,
       COALESCE(SUM(c.price_per_min), 0) AS revenue,
       COALESCE(SUM(CASE WHEN b.payout_share_percent IS NOT NULL THEN c.price_per_min * b.payout_share_percent / 100.0 ELSE c.price_per_min END), 0) AS astrologer_payout
     FROM consultations c
     LEFT JOIN boosts b ON b.id = c.boost_id
     WHERE c.status = 'COMPLETED'
     GROUP BY c.astrologer_id, c.type`
  );
  return rows.map(r => ({ astrologerId: r.astrologer_id, type: r.type, count: Number(r.n), revenue: Number(r.revenue), astrologerPayout: Math.round(Number(r.astrologer_payout)) }));
}

export async function countInProgress(): Promise<number> {
  const row = await queryOne<{ n: string }>(`SELECT COUNT(*) AS n FROM consultations WHERE status IN ('ASSIGNED', 'ACCEPTED', 'ACTIVE')`);
  return Number(row?.n ?? 0);
}

// For the admin Overview's recent-activity feed — joins in the astrologer's
// name since Consultation itself only carries astrologerId.
export async function listRecentWithAstrologerName(limit: number) {
  const rows = await query<ConsultationDbRow & { astrologer_name: string }>(
    `SELECT c.*, a.name AS astrologer_name
     FROM consultations c
     JOIN astrologers a ON a.id = c.astrologer_id
     ORDER BY c.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map(row => ({ ...fromRow(row), astrologerName: row.astrologer_name }));
}

export async function listAllConsultations(page: number, limit: number): Promise<{ rows: Consultation[]; total: number }> {
  const totalRow = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM consultations');
  const rows = await query<ConsultationDbRow>(
    'SELECT * FROM consultations ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, (page - 1) * limit]
  );
  return { rows: rows.map(fromRow), total: Number(totalRow?.n ?? 0) };
}

export async function findActiveStartedForAstrologer(astrologerId: number, executor?: Executor): Promise<Consultation[]> {
  const rows = await query<ConsultationDbRow>(
    `SELECT * FROM consultations WHERE astrologer_id = $1 AND status = 'ACTIVE' AND started_at IS NOT NULL`,
    [astrologerId],
    executor
  );
  return rows.map(fromRow);
}
