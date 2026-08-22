import { query, queryOne } from '../core/db.ts';
import type { BroadcastRow } from '../models/broadcast.ts';

export async function createBroadcast(message: string, createdBy: string | null): Promise<BroadcastRow> {
  const row = await queryOne<BroadcastRow>(
    'INSERT INTO broadcasts (message, created_by, active, created_at) VALUES ($1, $2, 1, $3) RETURNING *',
    [message, createdBy, Date.now()]
  );
  return row!;
}

export function listActiveBroadcasts(): Promise<BroadcastRow[]> {
  return query<BroadcastRow>('SELECT * FROM broadcasts WHERE active = 1 ORDER BY created_at DESC');
}

export function listAllBroadcasts(): Promise<BroadcastRow[]> {
  return query<BroadcastRow>('SELECT * FROM broadcasts ORDER BY created_at DESC');
}

export async function deactivateBroadcast(id: number) {
  await query('UPDATE broadcasts SET active = 0 WHERE id = $1', [id]);
}
