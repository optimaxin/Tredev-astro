import { query, queryOne, type Executor } from '../core/db.ts';
import type { ConsultationType, QueueEntry, QueueEntryStatus } from '../models/types.ts';

interface QueueEntryDbRow {
  id: string;
  astrologer_id: number;
  user_email: string;
  user_name: string;
  category: string;
  type: string;
  status: string;
  request_id: string;
  joined_at: string; // BIGINT comes back as a string from node-postgres
  promoted_consultation_id: string | null;
  duration_minutes: number;
}

function fromRow(row: QueueEntryDbRow): QueueEntry {
  return {
    id: row.id,
    astrologerId: row.astrologer_id,
    userEmail: row.user_email,
    userName: row.user_name,
    category: row.category,
    type: row.type as ConsultationType,
    status: row.status as QueueEntryStatus,
    requestId: row.request_id,
    joinedAt: Number(row.joined_at),
    promotedConsultationId: row.promoted_consultation_id ?? undefined,
    durationMinutes: row.duration_minutes,
  };
}

// Accepts an optional `executor` — requestConsultation in realtimeStore.ts
// inserts the queue entry from inside the same locked transaction it used to
// decide QUEUED, so the decision and the write stay atomic together.
export async function insertQueueEntry(e: QueueEntry, executor?: Executor) {
  await query(
    `INSERT INTO queue_entries (id, astrologer_id, user_email, user_name, category, type, status, request_id, joined_at, promoted_consultation_id, duration_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [e.id, e.astrologerId, e.userEmail.toLowerCase(), e.userName, e.category, e.type, e.status, e.requestId, e.joinedAt, e.promotedConsultationId ?? null, e.durationMinutes],
    executor
  );
}

export async function updateQueueEntry(e: QueueEntry, executor?: Executor) {
  await query(
    'UPDATE queue_entries SET status = $1, promoted_consultation_id = $2 WHERE id = $3',
    [e.status, e.promotedConsultationId ?? null, e.id],
    executor
  );
}

export async function findQueueEntryById(id: string): Promise<QueueEntry | undefined> {
  const row = await queryOne<QueueEntryDbRow>('SELECT * FROM queue_entries WHERE id = $1', [id]);
  return row ? fromRow(row) : undefined;
}

// Ordered by joined_at so position/FIFO semantics match the old array's
// natural insertion order — this ORDER BY is load-bearing, not cosmetic.
export async function listQueuedForAstrologer(astrologerId: number, executor?: Executor): Promise<QueueEntry[]> {
  const rows = await query<QueueEntryDbRow>(
    `SELECT * FROM queue_entries WHERE astrologer_id = $1 AND status = 'QUEUED' ORDER BY joined_at ASC`,
    [astrologerId],
    executor
  );
  return rows.map(fromRow);
}

export async function findQueuedEntryForUserEmail(userEmail: string): Promise<{ entry: QueueEntry; position: number } | undefined> {
  const row = await queryOne<QueueEntryDbRow>(
    `SELECT * FROM queue_entries WHERE status = 'QUEUED' AND user_email = $1 ORDER BY joined_at ASC LIMIT 1`,
    [userEmail.toLowerCase()]
  );
  if (!row) return undefined;
  const entry = fromRow(row);
  const queued = await listQueuedForAstrologer(entry.astrologerId);
  const position = queued.findIndex(q => q.id === entry.id) + 1;
  return { entry, position };
}
