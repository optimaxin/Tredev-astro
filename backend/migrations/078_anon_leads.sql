-- Captured name/email/phone for anonymous (not-logged-in) visitors, keyed by
-- their sticky visitor_id cookie-equivalent (see trackingService.ts). Lets
-- the Leads page show real contact details for someone who used a free
-- calculator but never signed up, instead of "Anonymous #xxxxx" with no way
-- to follow up.
CREATE TABLE anon_leads (
  visitor_id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
