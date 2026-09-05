import { query, queryOne } from '../core/db.ts';

// Per-astrologer, per-region price override — takes full precedence over the
// region's plain multiplier (see pricingEngine.ts's computePriceWithOverride)
// wherever it exists, so staff can hand-tune or CSV-bulk-set exact prices per
// astrologer per region instead of relying on one multiplier for everyone.
export interface AstrologerRegionPriceRow {
  astrologer_id: number;
  region_id: number;
  chat_price: number;
  call_price: number;
  video_price: number;
  updated_at: string;
}

export async function getOverride(astrologerId: number, regionId: number): Promise<AstrologerRegionPriceRow | undefined> {
  return queryOne<AstrologerRegionPriceRow>(
    'SELECT * FROM astrologer_region_prices WHERE astrologer_id = $1 AND region_id = $2',
    [astrologerId, regionId]
  );
}

// Keyed by `${astrologerId}:${regionId}` so a catalog page can look up every
// row's override in memory instead of one query per astrologer.
export async function listOverridesMap(): Promise<Map<string, AstrologerRegionPriceRow>> {
  const rows = await query<AstrologerRegionPriceRow>('SELECT * FROM astrologer_region_prices');
  return new Map(rows.map(r => [`${r.astrologer_id}:${r.region_id}`, r]));
}

export async function listOverridesForAdmin(): Promise<(AstrologerRegionPriceRow & { astrologer_name: string; region_name: string })[]> {
  return query(
    `SELECT p.*, a.name AS astrologer_name, r.name AS region_name
     FROM astrologer_region_prices p
     JOIN astrologers a ON a.id = p.astrologer_id
     JOIN pricing_regions r ON r.id = p.region_id
     ORDER BY a.name ASC, r.name ASC`
  );
}

export async function upsertOverride(astrologerId: number, regionId: number, chatPrice: number, callPrice: number, videoPrice: number): Promise<AstrologerRegionPriceRow> {
  const rows = await query<AstrologerRegionPriceRow>(
    `INSERT INTO astrologer_region_prices (astrologer_id, region_id, chat_price, call_price, video_price, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (astrologer_id, region_id) DO UPDATE SET chat_price = $3, call_price = $4, video_price = $5, updated_at = $6
     RETURNING *`,
    [astrologerId, regionId, chatPrice, callPrice, videoPrice, Date.now()]
  );
  return rows[0]!;
}

export async function deleteOverride(astrologerId: number, regionId: number): Promise<void> {
  await query('DELETE FROM astrologer_region_prices WHERE astrologer_id = $1 AND region_id = $2', [astrologerId, regionId]);
}
