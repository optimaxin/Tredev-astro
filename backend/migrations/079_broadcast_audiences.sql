-- Who a broadcast is shown to — lets staff/admin target just users, just
-- staff, just astrologers, any combination, or everyone (see admin.routes.ts's
-- POST /broadcasts). Defaults to every role so every broadcast sent before
-- this migration keeps reaching everyone exactly as it did before.
ALTER TABLE broadcasts ADD COLUMN audiences TEXT[] NOT NULL DEFAULT ARRAY['USER','STAFF','ASTROLOGIST','ADMIN'];
