-- Corrige a tabela technical_responsibles para gerar IDs automaticamente
-- Erro reportado: null value in column "id" of relation "technical_responsibles" violates not-null constraint

ALTER TABLE technical_responsibles
ALTER COLUMN id SET DEFAULT gen_random_uuid();
