-- Optional text overlay for a staff-uploaded homepage banner (see
-- CampaignBanner.tsx's DynamicBannerCarousel) — both null means "media only,
-- whole card click-through" (the original behaviour), unchanged for every
-- banner uploaded before this migration.
ALTER TABLE banners ADD COLUMN heading TEXT;
ALTER TABLE banners ADD COLUMN cta_text TEXT;
