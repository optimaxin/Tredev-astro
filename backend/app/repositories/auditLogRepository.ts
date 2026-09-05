import { randomUUID } from 'node:crypto';
import { query } from '../core/db.ts';

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_label: string;
  action: string;
  target: string;
  created_at: number;
}

export async function logAdminAction(actorUserId: string, actorLabel: string, action: string, target: string) {
  await query(
    'INSERT INTO audit_log (id, actor_user_id, actor_label, action, target, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [randomUUID(), actorUserId, actorLabel, action, target, Date.now()]
  );
}

export function listAuditLog(page: number, limit: number): Promise<AuditLogRow[]> {
  return query<AuditLogRow>('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, (page - 1) * limit]);
}

// For a profile's "last action" audit trail (Users/Astrologers drawer) —
// target is whatever label the action was logged against (email for a user,
// catalog name for an astrologer — see admin.routes.ts's audit() calls).
export function listAuditLogForTarget(target: string, limit: number): Promise<AuditLogRow[]> {
  return query<AuditLogRow>('SELECT * FROM audit_log WHERE target = $1 ORDER BY created_at DESC LIMIT $2', [target, limit]);
}
