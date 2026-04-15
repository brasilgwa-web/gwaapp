-- Migration: Add comments/orientations fields to report_settings
-- This allows admins to edit the "Comentários/Orientações" section text
-- and toggle whether it appears in reports.

ALTER TABLE report_settings
ADD COLUMN IF NOT EXISTS comments_orientations_enabled BOOLEAN DEFAULT true;

ALTER TABLE report_settings
ADD COLUMN IF NOT EXISTS comments_orientations_text TEXT;
