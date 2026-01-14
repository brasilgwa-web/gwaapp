-- Script para adicionar campo celular na tabela clients
-- Execute este script no Supabase SQL Editor

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'phone';
