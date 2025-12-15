-- v1_2_part3_migration.sql
-- Refactor: Move VMP (Limits) to Equipment-Test Link to allow override per Equipment Type

-- 1. Add VMP columns to equipment_tests (Catalog Link)
ALTER TABLE equipment_tests ADD COLUMN IF NOT EXISTS min_value NUMERIC;
ALTER TABLE equipment_tests ADD COLUMN IF NOT EXISTS max_value NUMERIC;
ALTER TABLE equipment_tests ADD COLUMN IF NOT EXISTS unit TEXT; -- Optional override, otherwise fallback to definition

-- 2. Migrate existing values? 
-- Optional: We could run a script to copy from test_definitions, but strictly speaking 
-- new links should define them. For backward compatibility, the code defaults to test_definitions if null.
-- But the user wants SPECIFIC limits.

-- No data migration script here to avoid complexity in SQL, 
-- we will update the UI to read from here first, fall back to definition second.
