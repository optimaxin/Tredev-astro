-- Staff-curated review shown on the astrologer's card in the public catalog
-- (see Astrologers.tsx) — null means no card review, same as today. Staff
-- picks one of this astrologer's own real reviews (see admin.routes.ts's
-- GET/PATCH /astrologers/:id/featured-review) rather than it being chosen
-- automatically (latest/highest-rated), which could surface something
-- unflattering or off-topic.
ALTER TABLE astrologers ADD COLUMN featured_review_id TEXT REFERENCES reviews(id) ON DELETE SET NULL;
