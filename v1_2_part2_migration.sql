-- v1_2_part2_migration.sql
-- Fix: Add missing column to clients table

ALTER TABLE clients ADD COLUMN IF NOT EXISTS default_discharges_drainages TEXT;
