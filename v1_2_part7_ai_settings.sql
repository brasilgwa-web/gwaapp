-- V1.2 Part 7: AI Settings Table for storing AI configuration
-- Run this to add new settings (model and tokens) to existing table

-- Insert new AI settings (will not error if already exists)
INSERT INTO ai_settings (setting_key, setting_value, description) VALUES
(
    'gemini_model',
    'gemini-2.5-flash',
    'Nome do modelo Gemini a ser usado (ex: gemini-2.5-flash, gemini-2.5-flash-lite)'
),
(
    'max_output_tokens',
    '2048',
    'Número máximo de tokens na resposta (recomendado: 1024-4096)'
)
ON CONFLICT (setting_key) DO NOTHING;
