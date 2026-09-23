import { query, queryOne } from '../core/db.ts';

// 10-day retention, matching the "keep it briefly, then gone" expectation
// for call recordings (see admin.routes.ts's 'call-recordings' section and
// realtimeStore.ts's deleteExpiredCallRecordings, which actually enforces
// this by deleting past-expiry rows).
export const CALL_RECORDING_RETENTION_MS = 10 * 24 * 60 * 60 * 1000;

export interface CallRecordingMeta {
  id: string;
  consultationId: string;
  astrologerName: string;
  userName: string;
  userEmail: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
}

interface MetaRow {
  id: string;
  consultation_id: string;
  astrologer_name: string;
  user_name: string;
  user_email: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  expires_at: string;
}

function metaFromRow(row: MetaRow): CallRecordingMeta {
  return {
    id: row.id,
    consultationId: row.consultation_id,
    astrologerName: row.astrologer_name,
    userName: row.user_name,
    userEmail: row.user_email,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  };
}

export async function insertCallRecording(params: { id: string; consultationId: string; mimeType: string; data: Buffer; createdAt: number }) {
  const expiresAt = params.createdAt + CALL_RECORDING_RETENTION_MS;
  await query(
    `INSERT INTO call_recordings (id, consultation_id, mime_type, data, size_bytes, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [params.id, params.consultationId, params.mimeType, params.data, params.data.length, params.createdAt, expiresAt]
  );
}

// Staff/Admin listing — metadata only, never the binary payload (that's a
// separate fetch per recording, see findCallRecordingData below).
export async function listCallRecordings(page: number, limit: number): Promise<{ rows: CallRecordingMeta[]; total: number }> {
  const totalRow = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM call_recordings');
  const rows = await query<MetaRow>(
    `SELECT r.id, r.consultation_id, a.name AS astrologer_name, c.user_name, c.user_email,
            r.mime_type, r.size_bytes, r.created_at, r.expires_at
     FROM call_recordings r
     JOIN consultations c ON c.id = r.consultation_id
     JOIN astrologers a ON a.id = c.astrologer_id
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  return { rows: rows.map(metaFromRow), total: Number(totalRow?.n ?? 0) };
}

export async function findCallRecordingData(id: string): Promise<{ mimeType: string; data: Buffer } | undefined> {
  const row = await queryOne<{ mime_type: string; data: Buffer }>('SELECT mime_type, data FROM call_recordings WHERE id = $1', [id]);
  return row ? { mimeType: row.mime_type, data: row.data } : undefined;
}

// Ticked from main.ts alongside the other periodic maintenance — deletes
// anything past its expires_at, which is what actually makes the 10-day
// retention real rather than just a number in a comment.
export async function deleteExpiredCallRecordings(now: number): Promise<number> {
  const rows = await query('DELETE FROM call_recordings WHERE expires_at <= $1 RETURNING id', [now]);
  return rows.length;
}
