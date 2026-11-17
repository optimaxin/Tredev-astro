import type { PricingRegionRow } from '../repositories/pricingRegionRepository.ts';

export interface PublicPricingRegion {
  id: number;
  name: string;
  countryCodes: string[];
  priceMultiplier: number;
  createdAt: number;
  updatedAt: number;
}

export function toPublicPricingRegion(row: PricingRegionRow): PublicPricingRegion {
  return {
    id: row.id,
    name: row.name,
    countryCodes: row.country_codes,
    priceMultiplier: Number(row.price_multiplier),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
