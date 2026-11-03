-- The app used to auto-seed 6 fake astrologer catalog rows on first boot
-- (seedAstrologerCatalog.ts, mirroring the frontend's old mockData.ts
-- ASTROLOGERS array) plus a demo "Astrologist Rahul Shastri" account
-- (seedDemoAccounts.ts). Both seeders are now gone/guarded in app code —
-- this migration removes the rows they already left behind in this
-- database. Guarded with NOT EXISTS so a row that somehow has real
-- consultation/review/booking history attached (e.g. a visitor actually
-- talked to one of these before real astrologers were onboarded) is left
-- alone instead of silently orphaning that history.
DELETE FROM astrologers a
WHERE a.name IN (
  'Astrologist Rahul Shastri', 'Pandit Meera Devi', 'Dr. Vikram Joshi',
  'Jyotishi Ananya Rao', 'Astrologist Suresh Kumar', 'Jyotishi Priya Nair'
)
AND NOT EXISTS (SELECT 1 FROM consultations c WHERE c.astrologer_id = a.id)
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.astrologer_id = a.id)
AND NOT EXISTS (SELECT 1 FROM queue_entries q WHERE q.astrologer_id = a.id)
AND NOT EXISTS (SELECT 1 FROM favorites f WHERE f.astrologer_id = a.id)
AND NOT EXISTS (SELECT 1 FROM boosts b WHERE b.astrologer_id = a.id)
AND NOT EXISTS (SELECT 1 FROM user_astrologer_loyalty l WHERE l.astrologer_id = a.id)
AND NOT EXISTS (SELECT 1 FROM consultation_slots s WHERE s.astrologer_id = a.id);
