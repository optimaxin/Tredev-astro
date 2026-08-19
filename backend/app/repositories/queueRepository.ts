import { db } from '../core/db.ts';
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
  joined_at: number;
  promoted_consultation_id: string | null;
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
    joinedAt: row.joined_at,
    promotedConsultationId: row.promoted_consultation_id ?? undefined,
  };
}

export function insertQueueEntry(e: QueueEntry) {
  db.prepare(`
    INSERT INTO queue_entries (id, astrologer_id, user_email, user_name, category, type, status, request_id, joined_at, promoted_consultation_id)
    VALUES (@id, @astrologerId, @userEmail, @userName, @category, @type, @status, @requestId, @joinedAt, @promotedConsultationId)
  `).run({
    id: e.id,
    astrologerId: e.astrologerId,
    userEmail: e.userEmail.toLowerCase(),
    userName: e.userName,
    category: e.category,
    type: e.type,
    status: e.status,
    requestId: e.requestId,
    joinedAt: e.joinedAt,
    promotedConsultationId: e.promotedConsultationId ?? null,
  });
}

export function updateQueueEntry(e: QueueEntry) {
  db.prepare('UPDATE queue_entries SET status = @status, promoted_consultation_id = @promotedConsultationId WHERE id = @id')
    .run({ id: e.id, status: e.status, promotedConsultationId: e.promotedConsultationId ?? null });
}

export function findQueueEntryById(id: string): QueueEntry | undefined {
  const row = db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(id) as QueueEntryDbRow | undefined;
  return row ? fromRow(row) : undefined;
}

// Ordered by joined_at so position/FIFO semantics match the old array's
// natural insertion order — this ORDER BY is load-bearing, not cosmetic.
export function listQueuedForAstrologer(astrologerId: number): QueueEntry[] {
  const rows = db
    .prepare(`SELECT * FROM queue_entries WHERE astrologer_id = ? AND status = 'QUEUED' ORDER BY joined_at ASC`)
    .all(astrologerId) as unknown as QueueEntryDbRow[];
  return rows.map(fromRow);
}

export function findQueuedEntryForUserEmail(userEmail: string): { entry: QueueEntry; position: number } | undefined {
  const row = db
    .prepare(`SELECT * FROM queue_entries WHERE status = 'QUEUED' AND user_email = ? ORDER BY joined_at ASC LIMIT 1`)
    .get(userEmail.toLowerCase()) as QueueEntryDbRow | undefined;
  if (!row) return undefined;
  const entry = fromRow(row);
  const queued = listQueuedForAstrologer(entry.astrologerId);
  const position = queued.findIndex(q => q.id === entry.id) + 1;
  return { entry, position };
}
