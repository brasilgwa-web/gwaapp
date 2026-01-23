-- Add cover_content column to store unified cover HTML
ALTER TABLE report_settings
ADD COLUMN IF NOT EXISTS cover_content TEXT;

COMMENT ON COLUMN report_settings.cover_content IS 'Conteúdo HTML unificado da capa do relatório (substitui campos individuais)';
