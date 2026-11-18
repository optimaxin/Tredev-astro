-- Page views now log every visit, not just a logged-in one — user_id is
-- nullable for an anonymous visitor, and ip_address/user_agent/country give
-- staff/admin a "fingerprint" to see where traffic is actually coming from
-- (see pageViewRepository.ts, GET /admin/traffic).
ALTER TABLE page_views ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE page_views ADD COLUMN ip_address TEXT;
ALTER TABLE page_views ADD COLUMN user_agent TEXT;
ALTER TABLE page_views ADD COLUMN country TEXT;
CREATE INDEX idx_page_views_created_at ON page_views(created_at DESC);
