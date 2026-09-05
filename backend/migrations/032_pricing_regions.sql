-- Staff-managed regions for consultation pricing. A visitor's IP-detected
-- country is matched against a region's country_codes, and that region's
-- price_multiplier is applied on top of an astrologer's own base price (see
-- pricingEngine.ts's computeRegionAdjustedPrice). A country not covered by
-- any region uses the default multiplier of 1.0 — today's plain price,
-- completely unchanged — so having zero regions is a full no-op.
CREATE TABLE pricing_regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_codes TEXT[] NOT NULL DEFAULT '{}', -- ISO 3166-1 alpha-2, e.g. {'US'}
  price_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
