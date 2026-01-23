-- Script para adicionar as novas configurações de IA
-- Execute este script no Supabase SQL Editor

-- Inserir configurações padrão (se não existirem)
INSERT INTO ai_settings (setting_key, setting_value, description, updated_at)
VALUES 
    ('gemini_api_key', '', 'Chave da API do Gemini (opcional, sobrescreve .env)', NOW()),
    ('chat_system_prompt', '', 'Prompt do sistema para o assistente de chat', NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- Verificar as configurações
SELECT * FROM ai_settings ORDER BY setting_key;
