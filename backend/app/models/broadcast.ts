import type { Role } from './user.ts';

// Which roles a broadcast is shown to — see broadcastRepository.ts's
// listActiveBroadcasts(role). ADMIN is included so an admin previewing their
// own console sees everything they send, same as before targeting existed.
export type BroadcastAudience = Role;

export interface BroadcastRow {
  id: number;
  message: string;
  created_by: string | null;
  active: number;
  created_at: number;
  audiences: BroadcastAudience[];
}

export interface PublicBroadcast {
  id: number;
  message: string;
  createdAt: number;
  active: boolean;
  audiences: BroadcastAudience[];
}

export function toPublicBroadcast(row: BroadcastRow): PublicBroadcast {
  return { id: row.id, message: row.message, createdAt: Number(row.created_at), active: !!row.active, audiences: row.audiences };
}
