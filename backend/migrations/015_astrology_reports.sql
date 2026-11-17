-- Paid report catalog (pricing/description shown pre-purchase). Purchasing
-- itself still runs through the existing frontend-local cart — this table
-- only replaces the static REPORTS mock array as the catalog's source of truth.
CREATE TABLE astrology_reports (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  pages INTEGER NOT NULL,
  sections INTEGER NOT NULL,
  price INTEGER NOT NULL,
  original_price INTEGER,
  popular INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_astrology_reports_display_order ON astrology_reports(display_order);
