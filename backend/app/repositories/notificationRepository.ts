import { query, queryOne, type Executor } from '../core/db.ts';
import type { AstrologerNotification, NotificationKind } from '../models/types.ts';

interface NotificationDbRow {
  id: string;
  astrologer_id: number;
  kind: string;
  message: string;
  related_consultation_id: string | null;
  read: number;
  created_at: string; // BIGINT comes back as a string from node-postgres
}

function fromRow(row: NotificationDbRow): AstrologerNotification {
  return {
    id: row.id,
    astrologerId: row.astrologer_id,
    kind: row.kind as NotificationKind,
    message: row.message,
    relatedConsultationId: row.related_consultation_id ?? undefined,
    read: !!row.read,
    createdAt: Number(row.created_at),
  };
}

export async function notificationExists(id: string, executor?: Executor): Promise<boolean> {
  const row = await queryOne('SELECT 1 FROM astrologer_notifications WHERE id = $1', [id], executor);
  return !!row;
}

// Accepts an optional `executor` — createNotification() in realtimeStore.ts
// runs the idempotency check + insert together from inside the same booking
// transaction when called during requestConsultation, so a concurrent
// duplicate can't slip in between the check and the write.
export async function insertNotification(n: AstrologerNotification, executor?: Executor) {
  await query(
    `INSERT INTO astrologer_notifications (id, astrologer_id, kind, message, related_consultation_id, read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [n.id, n.astrologerId, n.kind, n.message, n.relatedConsultationId ?? null, n.read ? 1 : 0, n.createdAt],
    executor
  );
}

export async function listNotificationsForAstrologer(astrologerId: number): Promise<AstrologerNotification[]> {
  const rows = await query<NotificationDbRow>('SELECT * FROM astrologer_notifications WHERE astrologer_id = $1 ORDER BY created_at DESC', [astrologerId]);
  return rows.map(fromRow);
}

export async function markNotificationRead(astrologerId: number, id: string) {
  await query('UPDATE astrologer_notifications SET read = 1 WHERE astrologer_id = $1 AND id = $2', [astrologerId, id]);
}

export async function markAllNotificationsRead(astrologerId: number) {
  await query('UPDATE astrologer_notifications SET read = 1 WHERE astrologer_id = $1', [astrologerId]);
}
