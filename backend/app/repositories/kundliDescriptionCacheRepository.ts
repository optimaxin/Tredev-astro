import { query } from '../core/db.ts';

export interface DescriptionCacheRow {
  textHash: string;
  language: string;
  rewrittenText: string;
  needsReview: boolean;
}

export interface DescriptionCacheWrite extends DescriptionCacheRow {
  promptVersion: string;
  originalText: string;
  model: string;
}

// One SELECT ... = ANY($1) rather than N lookups — a single kundli-full
// request can touch 20-40 description slots at once.
export async function getCachedRewrites(hashes: string[], language: string, promptVersion: string): Promise<DescriptionCacheRow[]> {
  if (hashes.length === 0) return [];
  const rows = await query<{ text_hash: string; language: string; rewritten_text: string; needs_review: number }>(
    `SELECT text_hash, language, rewritten_text, needs_review
     FROM kundli_description_rewrites
     WHERE text_hash = ANY($1) AND language = $2 AND prompt_version = $3`,
    [hashes, language, promptVersion],
  );
  return rows.map(r => ({ textHash: r.text_hash, language: r.language, rewrittenText: r.rewritten_text, needsReview: r.needs_review === 1 }));
}

export async function saveRewrites(rows: DescriptionCacheWrite[]): Promise<void> {
  for (const r of rows) {
    await query(
      `INSERT INTO kundli_description_rewrites
         (text_hash, language, prompt_version, original_text, rewritten_text, needs_review, model, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (text_hash, language, prompt_version) DO NOTHING`,
      [r.textHash, r.language, r.promptVersion, r.originalText, r.rewrittenText, r.needsReview ? 1 : 0, r.model, Date.now()],
    );
  }
}
