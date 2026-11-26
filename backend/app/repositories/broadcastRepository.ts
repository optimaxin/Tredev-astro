import { query, queryOne } from '../core/db.ts';
import type { BroadcastAudience, BroadcastRow } from '../models/broadcast.ts';

export async function createBroadcast(message: string, createdBy: string | null, audiences: BroadcastAudience[]): Promise<BroadcastRow> {
  const row = await queryOne<BroadcastRow>(
    'INSERT INTO broadcasts (message, created_by, active, created_at, audiences) VALUES ($1, $2, 1, $3, $4) RETURNING *',
    [message, createdBy, Date.now(), audiences]
  );
  return row!;
}

// `role` is the viewer's own role (or null for an anonymous site visitor,
// treated as USER — that's who an anonymous visitor would become by
// signing up) — only broadcasts this viewer was targeted with come back.
// Not used from admin.routes.ts's listAllBroadcasts below, which is the
// admin's own management view and must show every broadcast regardless of
// who it targets.
export function listActiveBroadcasts(role: BroadcastAudience | null): Promise<BroadcastRow[]> {
  return query<BroadcastRow>(
    'SELECT * FROM broadcasts WHERE active = 1 AND $1 = ANY(audiences) ORDER BY created_at DESC',
    [role ?? 'USER']
  );
}

export function listAllBroadcasts(): Promise<BroadcastRow[]> {
  return query<BroadcastRow>('SELECT * FROM broadcasts ORDER BY created_at DESC');
}

export async function deactivateBroadcast(id: number) {
  await query('UPDATE broadcasts SET active = 0 WHERE id = $1', [id]);
}
