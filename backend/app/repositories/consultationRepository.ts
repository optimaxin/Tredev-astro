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
  };
}

// Accepts an optional `executor` (a transaction client) — requestConsultation
// in realtimeStore.ts calls this from inside a locked transaction so the
// capacity check and the insert are atomic together (see db.ts's
// withTransaction comment for why that lock is now required at all).
export async function insertConsultation(c: Consultation, executor?: Executor) {
  await query(
    `INSERT INTO consultations
      (id, astrologer_id, user_email, user_name, category, type, status, from_queue, request_id, created_at, accepted_at, started_at, ended_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      c.id, c.astrologerId, c.userEmail.toLowerCase(), c.userName, c.category, c.type, c.status,
      c.fromQueue ? 1 : 0, c.requestId, c.createdAt, c.acceptedAt ?? null, c.startedAt ?? null, c.endedAt ?? null,
    ],
    executor
  );
}

export async function updateConsultation(c: Consultation) {
  await query(
    'UPDATE consultations SET status = $1, accepted_at = $2, started_at = $3, ended_at = $4 WHERE id = $5',
    [c.status, c.acceptedAt ?? null, c.startedAt ?? null, c.endedAt ?? null, c.id]
  );
}

export async function findConsultationById(id: string): Promise<Consultation | undefined> {
  const row = await queryOne<ConsultationDbRow>('SELECT * FROM consultations WHERE id = $1', [id]);
  return row ? fromRow(row) : undefined;
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

export async function findActiveStartedForAstrologer(astrologerId: number, executor?: Executor): Promise<Consultation[]> {
  const rows = await query<ConsultationDbRow>(
    `SELECT * FROM consultations WHERE astrologer_id = $1 AND status = 'ACTIVE' AND started_at IS NOT NULL`,
    [astrologerId],
    executor
  );
  return rows.map(fromRow);
}
