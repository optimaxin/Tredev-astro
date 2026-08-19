import { db } from '../core/db.ts';
import type { AstrologerNotification, NotificationKind } from '../models/types.ts';

interface NotificationDbRow {
  id: string;
  astrologer_id: number;
  kind: string;
  message: string;
  related_consultation_id: string | null;
  read: number;
  created_at: number;
}

function fromRow(row: NotificationDbRow): AstrologerNotification {
  return {
    id: row.id,
    astrologerId: row.astrologer_id,
    kind: row.kind as NotificationKind,
    message: row.message,
    relatedConsultationId: row.related_consultation_id ?? undefined,
    read: !!row.read,
    createdAt: row.created_at,
  };
}

export function notificationExists(id: string): boolean {
  return !!db.prepare('SELECT 1 FROM astrologer_notifications WHERE id = ?').get(id);
}

export function insertNotification(n: AstrologerNotification) {
  db.prepare(`
    INSERT INTO astrologer_notifications (id, astrologer_id, kind, message, related_consultation_id, read, created_at)
    VALUES (@id, @astrologerId, @kind, @message, @relatedConsultationId, @read, @createdAt)
  `).run({
    id: n.id,
    astrologerId: n.astrologerId,
    kind: n.kind,
    message: n.message,
    relatedConsultationId: n.relatedConsultationId ?? null,
    read: n.read ? 1 : 0,
    createdAt: n.createdAt,
  });
}

export function listNotificationsForAstrologer(astrologerId: number): AstrologerNotification[] {
  const rows = db
    .prepare('SELECT * FROM astrologer_notifications WHERE astrologer_id = ? ORDER BY created_at DESC')
    .all(astrologerId) as unknown as NotificationDbRow[];
  return rows.map(fromRow);
}

export function markNotificationRead(astrologerId: number, id: string) {
  db.prepare('UPDATE astrologer_notifications SET read = 1 WHERE astrologer_id = ? AND id = ?').run(astrologerId, id);
}

export function markAllNotificationsRead(astrologerId: number) {
  db.prepare('UPDATE astrologer_notifications SET read = 1 WHERE astrologer_id = ?').run(astrologerId);
}
