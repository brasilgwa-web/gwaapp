-- Adicionar coluna footer_text na tabela report_settings
-- Execute este script no Supabase SQL Editor

ALTER TABLE report_settings 
ADD COLUMN IF NOT EXISTS footer_text TEXT;

-- Comentário para documentação
COMMENT ON COLUMN report_settings.footer_text IS 'Texto personalizado do rodapé que aparece em todas as páginas do relatório';
