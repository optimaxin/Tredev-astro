-- Reverses 062_ai_traffic_reclassify_history.sql from its audit trail.
-- NOT run automatically (the runner only reads migrations/*.sql, not this
-- folder). Run by hand inside a transaction, after a backup:
--   BEGIN; \i backend/migrations/rollback/062_down.sql; -- check counts --; COMMIT;
UPDATE ai_usage u SET traffic_source = r.old_source
FROM ai_traffic_reclassification r
WHERE r.migration = '062' AND r.table_name = 'ai_usage' AND r.row_id = u.id::text;

UPDATE ai_evaluations e SET traffic_source = r.old_source
FROM ai_traffic_reclassification r
WHERE r.migration = '062' AND r.table_name = 'ai_evaluations' AND r.row_id = e.id::text;

DELETE FROM ai_traffic_reclassification WHERE migration = '062';
DELETE FROM _migrations WHERE name = '062_ai_traffic_reclassify_history.sql';
-- The (now empty) audit table is left in place; drop it only if 058 is also
-- being reversed: DROP TABLE IF EXISTS ai_traffic_reclassification;
