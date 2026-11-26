import { query, queryOne } from '../core/db.ts';

export const MAX_BANNERS = 7;

export interface Banner {
  id: string;
  mediaType: 'image' | 'video';
  mediaData: string;
  linkUrl: string | null;
  heading: string | null;
  ctaText: string | null;
  createdAt: number;
  expiresAt: number | null;
}

interface BannerRow {
  id: string;
  media_type: 'image' | 'video';
  media_data: string;
  link_url: string | null;
  heading: string | null;
  cta_text: string | null;
  created_at: string;
  expires_at: string | null;
}

function fromRow(row: BannerRow): Banner {
  return {
    id: row.id,
    mediaType: row.media_type,
    mediaData: row.media_data,
    linkUrl: row.link_url,
    heading: row.heading,
    ctaText: row.cta_text,
    createdAt: Number(row.created_at),
    expiresAt: row.expires_at === null ? null : Number(row.expires_at),
  };
}

export async function countBanners(): Promise<number> {
  const row = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM banners');
  return Number(row?.n ?? 0);
}

export async function listBanners(): Promise<Banner[]> {
  const rows = await query<BannerRow>('SELECT * FROM banners ORDER BY created_at ASC');
  return rows.map(fromRow);
}

// Public homepage feed — same rows, just excludes anything already past its
// own expiry so a visitor never sees a banner staff considers gone, even in
// the (at most hourly) gap before the cleanup sweep deletes it for real.
export async function listActiveBanners(now: number): Promise<Banner[]> {
  const rows = await query<BannerRow>(
    'SELECT * FROM banners WHERE expires_at IS NULL OR expires_at > $1 ORDER BY created_at ASC',
    [now]
  );
  return rows.map(fromRow);
}

export async function insertBanner(params: {
  id: string; mediaType: 'image' | 'video'; mediaData: string; linkUrl: string | null;
  heading: string | null; ctaText: string | null; createdAt: number; expiresAt: number | null;
}): Promise<Banner> {
  const row = await queryOne<BannerRow>(
    `INSERT INTO banners (id, media_type, media_data, link_url, heading, cta_text, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [params.id, params.mediaType, params.mediaData, params.linkUrl, params.heading, params.ctaText, params.createdAt, params.expiresAt]
  );
  return fromRow(row!);
}

// A field only changes when its key is present in `patch` at all — `null`
// is a deliberate clear (e.g. removing the link, the heading, or switching
// to "never expires"), distinct from omitting the key to leave it untouched.
export async function updateBanner(id: string, patch: { linkUrl?: string | null; heading?: string | null; ctaText?: string | null; expiresAt?: number | null }): Promise<Banner | undefined> {
  const row = await queryOne<BannerRow>(
    `UPDATE banners SET
       link_url = CASE WHEN $2 THEN $3 ELSE link_url END,
       heading = CASE WHEN $4 THEN $5 ELSE heading END,
       cta_text = CASE WHEN $6 THEN $7 ELSE cta_text END,
       expires_at = CASE WHEN $8 THEN $9 ELSE expires_at END
     WHERE id = $1 RETURNING *`,
    [id, 'linkUrl' in patch, patch.linkUrl ?? null, 'heading' in patch, patch.heading ?? null, 'ctaText' in patch, patch.ctaText ?? null, 'expiresAt' in patch, patch.expiresAt ?? null]
  );
  return row ? fromRow(row) : undefined;
}

export async function deleteBanner(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM banners WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

// Ticked hourly from main.ts, same cadence as call recordings' retention
// sweep — makes the "never" toggle meaningful (rows with a NULL expires_at
// are never touched here) rather than a promise nothing enforces.
export async function deleteExpiredBanners(now: number): Promise<number> {
  const rows = await query('DELETE FROM banners WHERE expires_at IS NOT NULL AND expires_at <= $1 RETURNING id', [now]);
  return rows.length;
}
