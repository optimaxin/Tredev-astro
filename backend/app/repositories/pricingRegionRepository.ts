import { query, queryOne } from '../core/db.ts';

export interface PricingRegionRow {
  id: number;
  name: string;
  country_codes: string[];
  price_multiplier: string; // NUMERIC comes back as a string from pg
  created_at: string;
  updated_at: string;
}

export async function listPricingRegions(): Promise<PricingRegionRow[]> {
  return query<PricingRegionRow>('SELECT * FROM pricing_regions ORDER BY name ASC');
}

export async function findPricingRegionById(id: number): Promise<PricingRegionRow | undefined> {
  return queryOne<PricingRegionRow>('SELECT * FROM pricing_regions WHERE id = $1', [id]);
}

export async function createPricingRegion(name: string, countryCodes: string[], multiplier: number): Promise<PricingRegionRow> {
  const now = Date.now();
  const rows = await query<PricingRegionRow>(
    `INSERT INTO pricing_regions (name, country_codes, price_multiplier, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4) RETURNING *`,
    [name, countryCodes, multiplier, now]
  );
  return rows[0]!;
}

export async function updatePricingRegion(id: number, name: string, countryCodes: string[], multiplier: number): Promise<PricingRegionRow | undefined> {
  return queryOne<PricingRegionRow>(
    `UPDATE pricing_regions SET name = $2, country_codes = $3, price_multiplier = $4, updated_at = $5 WHERE id = $1 RETURNING *`,
    [id, name, countryCodes, multiplier, Date.now()]
  );
}

export async function deletePricingRegion(id: number): Promise<void> {
  await query('DELETE FROM pricing_regions WHERE id = $1', [id]);
}

// A country not covered by any region uses the default multiplier of 1.0 —
// today's plain price, unchanged. The region list is expected to stay small
// (a handful of staff-managed entries), so fetching all of them and matching
// in memory is simpler than a dedicated indexed lookup query.
export async function getRegionForCountry(countryCode: string | null): Promise<PricingRegionRow | null> {
  if (!countryCode) return null;
  const regions = await listPricingRegions();
  return regions.find(r => r.country_codes.some(c => c.toUpperCase() === countryCode.toUpperCase())) ?? null;
}

export async function getMultiplierForCountry(countryCode: string | null): Promise<number> {
  const region = await getRegionForCountry(countryCode);
  return region ? Number(region.price_multiplier) : 1;
}
