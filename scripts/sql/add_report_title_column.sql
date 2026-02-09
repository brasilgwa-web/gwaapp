-- Add report_title column to report_settings table
ALTER TABLE report_settings 
ADD COLUMN IF NOT EXISTS report_title TEXT DEFAULT 'Relatório de Atendimento Técnico em Campo';

-- Update existing rows to have the default value if null
UPDATE report_settings 
SET report_title = 'Relatório de Atendimento Técnico em Campo' 
WHERE report_title IS NULL;
