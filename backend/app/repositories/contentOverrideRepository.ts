import { query } from '../core/db.ts';

export interface ContentOverrideRow {
  key: string;
  value: string;
  updated_by: string | null;
  updated_at: number;
}

// The public-facing shape: just key -> value, merged over the frontend's
// hardcoded translations/image defaults (see AppContext.tsx's t()).
export async function listContentOverrideValues(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>('SELECT key, value FROM content_overrides');
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

// The admin-facing shape — includes who/when, for the Content editor's list.
export async function listContentOverrideRows(): Promise<ContentOverrideRow[]> {
  return query<ContentOverrideRow>('SELECT * FROM content_overrides ORDER BY updated_at DESC');
}

export async function upsertContentOverride(key: string, value: string, updatedBy: string): Promise<void> {
  await query(
    `INSERT INTO content_overrides (key, value, updated_by, updated_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = $4`,
    [key, value, updatedBy, Date.now()]
  );
}

export async function deleteContentOverride(key: string): Promise<void> {
  await query('DELETE FROM content_overrides WHERE key = $1', [key]);
}
