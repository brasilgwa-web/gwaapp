-- v1_1_part4_migration.sql

-- Add 'general_observations' to visits table
-- This is distinct from the existing 'observations' which might be used for "Technical Analysis" or specific notes.
-- "Observações Gerais" in the PDF.
ALTER TABLE visits ADD COLUMN IF NOT EXISTS general_observations TEXT;
