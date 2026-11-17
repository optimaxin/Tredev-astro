-- A login "session" = one refresh-token family: every rotation keeps the
-- same family_id, so an access token can carry it (JWT `sid`) and
-- requireAuth can reject that access token the moment its session is
-- logged out / revoked, instead of waiting out the JWT's own expiry.
-- Pre-existing rows keep family_id NULL and fall back to their own id.
ALTER TABLE refresh_tokens ADD COLUMN family_id TEXT;
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
