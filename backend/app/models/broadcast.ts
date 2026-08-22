export interface BroadcastRow {
  id: number;
  message: string;
  created_by: string | null;
  active: number;
  created_at: number;
}

export interface PublicBroadcast {
  id: number;
  message: string;
  createdAt: number;
  active: boolean;
}

export function toPublicBroadcast(row: BroadcastRow): PublicBroadcast {
  return { id: row.id, message: row.message, createdAt: Number(row.created_at), active: !!row.active };
}
