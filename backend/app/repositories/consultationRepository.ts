import { db } from '../core/db.ts';
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
  created_at: number;
  accepted_at: number | null;
  started_at: number | null;
  ended_at: number | null;
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
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
  };
}

export function insertConsultation(c: Consultation) {
  db.prepare(`
    INSERT INTO consultations
      (id, astrologer_id, user_email, user_name, category, type, status, from_queue, request_id, created_at, accepted_at, started_at, ended_at)
    VALUES
      (@id, @astrologerId, @userEmail, @userName, @category, @type, @status, @fromQueue, @requestId, @createdAt, @acceptedAt, @startedAt, @endedAt)
  `).run({
    id: c.id,
    astrologerId: c.astrologerId,
    userEmail: c.userEmail.toLowerCase(),
    userName: c.userName,
    category: c.category,
    type: c.type,
    status: c.status,
    fromQueue: c.fromQueue ? 1 : 0,
    requestId: c.requestId,
    createdAt: c.createdAt,
    acceptedAt: c.acceptedAt ?? null,
    startedAt: c.startedAt ?? null,
    endedAt: c.endedAt ?? null,
  });
}

export function updateConsultation(c: Consultation) {
  db.prepare(`
    UPDATE consultations SET status = @status, accepted_at = @acceptedAt, started_at = @startedAt, ended_at = @endedAt
    WHERE id = @id
  `).run({ id: c.id, status: c.status, acceptedAt: c.acceptedAt ?? null, startedAt: c.startedAt ?? null, endedAt: c.endedAt ?? null });
}

export function findConsultationById(id: string): Consultation | undefined {
  const row = db.prepare('SELECT * FROM consultations WHERE id = ?').get(id) as ConsultationDbRow | undefined;
  return row ? fromRow(row) : undefined;
}

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'ACTIVE'];

export function countActiveForAstrologer(astrologerId: number): number {
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(',');
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM consultations WHERE astrologer_id = ? AND status IN (${placeholders})`)
    .get(astrologerId, ...ACTIVE_STATUSES) as { n: number };
  return row.n;
}

export function findActiveOrAcceptedForAstrologer(astrologerId: number): Consultation | undefined {
  const row = db
    .prepare(`SELECT * FROM consultations WHERE astrologer_id = ? AND status IN ('ACCEPTED', 'ACTIVE') LIMIT 1`)
    .get(astrologerId) as ConsultationDbRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function findAssignedForAstrologer(astrologerId: number): Consultation[] {
  const rows = db.prepare(`SELECT * FROM consultations WHERE astrologer_id = ? AND status = 'ASSIGNED'`).all(astrologerId) as unknown as ConsultationDbRow[];
  return rows.map(fromRow);
}

export function findLatestForUser(userEmail: string): Consultation | undefined {
  const row = db
    .prepare(`SELECT * FROM consultations WHERE user_email = ? ORDER BY created_at DESC LIMIT 1`)
    .get(userEmail.toLowerCase()) as ConsultationDbRow | undefined;
  return row ? fromRow(row) : undefined;
}

export function findActiveStartedForAstrologer(astrologerId: number): Consultation[] {
  const rows = db
    .prepare(`SELECT * FROM consultations WHERE astrologer_id = ? AND status = 'ACTIVE' AND started_at IS NOT NULL`)
    .all(astrologerId) as unknown as ConsultationDbRow[];
  return rows.map(fromRow);
}
