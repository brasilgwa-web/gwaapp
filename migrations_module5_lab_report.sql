-- Migration to add Lab Report fields to visits table

ALTER TABLE visits
ADD COLUMN IF NOT EXISTS lab_report_status BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lab_report_url TEXT,
ADD COLUMN IF NOT EXISTS lab_report_comments TEXT;

-- Also add a setting for the inbox folder id in report_settings if it exists, or just use ai_settings
-- Let's check if we can add it to ai_settings for simplicity
INSERT INTO ai_settings (setting_key, setting_value, description)
VALUES ('google_drive_inbox_folder_id', '', 'ID da Pasta do Google Drive (Caixa de Entrada de Laudos)')
ON CONFLICT (setting_key) DO NOTHING;
