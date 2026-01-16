-- Add cover background color column to report_settings table
ALTER TABLE report_settings
ADD COLUMN IF NOT EXISTS cover_background_color TEXT DEFAULT '#1e40af';

COMMENT ON COLUMN report_settings.cover_background_color IS 'Cor de fundo da capa do relatório em formato hexadecimal (ex: #1e40af)';
