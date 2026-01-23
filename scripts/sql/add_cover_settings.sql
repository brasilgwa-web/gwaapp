-- Add report cover settings to report_settings table
ALTER TABLE report_settings
ADD COLUMN IF NOT EXISTS cover_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS cover_title TEXT DEFAULT 'Relatório de Ensaio Analítico',
ADD COLUMN IF NOT EXISTS cover_subtitle TEXT DEFAULT 'Prezado Cliente',
ADD COLUMN IF NOT EXISTS cover_text TEXT DEFAULT 'Segue relatórios de ensaios analíticos para controle de processo referente aos serviços contratados.',
ADD COLUMN IF NOT EXISTS cover_footer_text TEXT DEFAULT 'Atendimento ao Cliente - Para esclarecimentos de suas dúvidas: Fones: (011) 9.8348.9922 (011) 9.8331.7957 - E-mail: atendimento@wgabrasil.com.br',
ADD COLUMN IF NOT EXISTS cover_signature_name TEXT DEFAULT 'Adriano Carlos Gava',
ADD COLUMN IF NOT EXISTS cover_signature_role TEXT DEFAULT 'Gestor - Laboratório de Aguas e Processos de Tratamento';
