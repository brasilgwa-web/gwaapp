-- Adicionar coluna CRQ na tabela profiles
-- Execute este script no Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS crq TEXT;

-- Comentário para documentação
COMMENT ON COLUMN profiles.crq IS 'Número do Conselho Regional de Química do usuário';
