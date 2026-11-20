ALTER TABLE page_views ADD COLUMN visitor_id TEXT;
CREATE INDEX idx_page_views_visitor_id ON page_views(visitor_id);
