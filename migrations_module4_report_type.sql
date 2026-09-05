-- Módulo 4: Tipos de Relatórios e Flexibilidade

-- 1. Adicionar campo em visits
ALTER TABLE visits ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'technical';

-- 2. Adicionar campo em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_report_type text DEFAULT 'technical';

-- 3. Adicionar campo em report_settings
ALTER TABLE report_settings ADD COLUMN IF NOT EXISTS type text DEFAULT 'technical';

-- 4. Duplicar o registro de report_settings para 'laboratory' se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM report_settings WHERE type = 'laboratory') THEN
        INSERT INTO report_settings (
            report_title, 
            logo_url, 
            logo2_url, 
            cover_enabled, 
            cover_background_color, 
            cover_content, 
            cover_image_url, 
            footer_text, 
            current_report_number, 
            highest_emitted_number, 
            comments_orientations_enabled, 
            comments_orientations_text, 
            email_subject_default,
            email_body_default,
            type,
            initial_report_number
        )
        SELECT 
            'Resultados Analíticos de Laboratório', 
            logo_url, 
            logo2_url, 
            cover_enabled, 
            cover_background_color, 
            cover_content, 
            cover_image_url, 
            footer_text, 
            current_report_number, 
            highest_emitted_number, 
            comments_orientations_enabled, 
            comments_orientations_text, 
            email_subject_default,
            email_body_default,
            'laboratory',
            initial_report_number
        FROM report_settings 
        WHERE type = 'technical'
        LIMIT 1;
    END IF;
END $$;
