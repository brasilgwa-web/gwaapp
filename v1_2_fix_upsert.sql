-- Fix for Reading Save Error (Upsert support)
-- We need a specific UNIQUE constraint to allow ON CONFLICT (visit_id, equipment_id, test_definition_id) DO UPDATE.

-- 1. Optional: Cleanup potential duplicates (keeping the latest one) - Safe measure
-- This deletes record 'a' if there exists a record 'b' with same keys but created more recently (or higher id).
DELETE FROM test_results a USING test_results b
WHERE a.id < b.id
  AND a.visit_id = b.visit_id
  AND a.equipment_id = b.equipment_id
  AND a.test_definition_id = b.test_definition_id;

-- 2. Add the usage Unique Constraint
ALTER TABLE test_results 
ADD CONSTRAINT unique_visit_equipment_test 
UNIQUE (visit_id, equipment_id, test_definition_id);
