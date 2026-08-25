import { query, queryOne } from '../core/db.ts';

export interface KundliHistoryEntry {
  id: number;
  name: string;
  date: string;
  time: string;
  timezoneOffsetMinutes: number;
  latitude: number;
  longitude: number;
  placeLabel: string | null;
  createdAt: number;
}

interface KundliHistoryRow {
  id: number;
  name: string;
  date: string;
  time: string;
  timezone_offset_minutes: number;
  latitude: number;
  longitude: number;
  place_label: string | null;
  created_at: string;
}

function toEntry(row: KundliHistoryRow): KundliHistoryEntry {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    time: row.time,
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    latitude: row.latitude,
    longitude: row.longitude,
    placeLabel: row.place_label,
    createdAt: Number(row.created_at),
  };
}

export async function saveKundliHistoryEntry(userId: string, entry: {
  name: string; date: string; time: string; timezoneOffsetMinutes: number; latitude: number; longitude: number; placeLabel: string | null;
}): Promise<KundliHistoryEntry> {
  const row = await queryOne<KundliHistoryRow>(
    `INSERT INTO kundli_history (user_id, name, date, time, timezone_offset_minutes, latitude, longitude, place_label, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, date, time, timezone_offset_minutes, latitude, longitude, place_label, created_at`,
    [userId, entry.name, entry.date, entry.time, entry.timezoneOffsetMinutes, entry.latitude, entry.longitude, entry.placeLabel, Date.now()]
  );
  return toEntry(row!);
}

export async function listKundliHistory(userId: string): Promise<KundliHistoryEntry[]> {
  const rows = await query<KundliHistoryRow>(
    'SELECT id, name, date, time, timezone_offset_minutes, latitude, longitude, place_label, created_at FROM kundli_history WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(toEntry);
}

export async function deleteKundliHistoryEntry(userId: string, id: number): Promise<void> {
  await query('DELETE FROM kundli_history WHERE user_id = $1 AND id = $2', [userId, id]);
}
