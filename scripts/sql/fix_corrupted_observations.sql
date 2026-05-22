-- =============================================================
-- FIX: Corrigir emojis e acentos corrompidos nos relatórios passados
-- Causa: double-encoding UTF-8 (bytes UTF-8 interpretados como Latin-1)
-- 
-- EXECUTAR NO: Supabase Dashboard > SQL Editor
-- DATA: 2026-04-01
-- =============================================================

-- =============================================
-- PASSO 1: DIAGNÓSTICO - Ver quantos registros estão afetados
-- =============================================
-- Execute este bloco primeiro para verificar antes de corrigir

SELECT 
  id,
  visit_date,
  LEFT(observations, 150) as obs_preview
FROM visits 
WHERE observations IS NOT NULL
  AND (
    -- Emojis corrompidos (padrão: ð + Ÿ = chr(240) + chr(376))
    observations LIKE '%' || chr(240) || chr(376) || '%'
    -- Acentos corrompidos (Ã seguido de caractere especial)
    OR observations LIKE '%' || chr(195) || chr(161) || '%'  -- Ã¡ (á corrompido)
    OR observations LIKE '%' || chr(195) || chr(169) || '%'  -- Ã© (é corrompido)  
    OR observations LIKE '%' || chr(195) || chr(173) || '%'  -- Ã­ (í corrompido)
    OR observations LIKE '%' || chr(195) || chr(167) || '%'  -- Ã§ (ç corrompido)
    OR observations LIKE '%' || chr(195) || chr(181) || '%'  -- Ãµ (õ corrompido)
    OR observations LIKE '%' || chr(195) || chr(163) || '%'  -- Ã£ (ã corrompido)
    -- Texto específico corrompido
    OR observations LIKE '%CRÃ TICO%'
  )
ORDER BY visit_date DESC;

-- =============================================
-- PASSO 2: CORREÇÃO - Corrigir emojis corrompidos
-- =============================================
-- Os emojis foram double-encoded: UTF-8 bytes → Latin-1/Win1252 → UTF-8
-- Padrão: 4 chars (ð + Ÿ + X + Y) representam 1 emoji

BEGIN;

-- 🟢 Verde (OK): ðŸŸ¢ → 🟢
-- chr(240)=ð, chr(376)=Ÿ, chr(376)=Ÿ, chr(162)=¢
UPDATE visits 
SET observations = REPLACE(
  observations, 
  chr(240) || chr(376) || chr(376) || chr(162),
  '🟢'
)
WHERE observations LIKE '%' || chr(240) || chr(376) || chr(376) || chr(162) || '%';

-- 🟡 Amarelo (ALERTA): ðŸŸ¡ → 🟡
-- chr(240)=ð, chr(376)=Ÿ, chr(376)=Ÿ, chr(161)=¡
UPDATE visits 
SET observations = REPLACE(
  observations, 
  chr(240) || chr(376) || chr(376) || chr(161),
  '🟡'
)
WHERE observations LIKE '%' || chr(240) || chr(376) || chr(376) || chr(161) || '%';

-- 🔴 Vermelho (CRÍTICO): ðŸ"´ → 🔴
-- chr(240)=ð, chr(376)=Ÿ, chr(8221)=", chr(180)=´
UPDATE visits 
SET observations = REPLACE(
  observations, 
  chr(240) || chr(376) || chr(8221) || chr(180),
  '🔴'
)
WHERE observations LIKE '%' || chr(240) || chr(376) || chr(8221) || chr(180) || '%';

-- 🔧 Ferramenta: ðŸ"§ → 🔧 
-- chr(240)=ð, chr(376)=Ÿ, chr(8221)=", chr(167)=§
UPDATE visits 
SET observations = REPLACE(
  observations, 
  chr(240) || chr(376) || chr(8221) || chr(167),
  '🔧'
)
WHERE observations LIKE '%' || chr(240) || chr(376) || chr(8221) || chr(167) || '%';

-- 📍 Pin: ðŸ" → 📍
-- chr(240)=ð, chr(376)=Ÿ, chr(8220)="
UPDATE visits 
SET observations = REPLACE(
  observations, 
  chr(240) || chr(376) || chr(8220),
  '📍'
)
WHERE observations LIKE '%' || chr(240) || chr(376) || chr(8220) || '%';

-- =============================================
-- PASSO 3: CORREÇÃO - Texto "CRÃ TICO" → "CRÍTICO"
-- =============================================
UPDATE visits 
SET observations = REPLACE(observations, 'CRÃ TICO', 'CRÍTICO')
WHERE observations LIKE '%CRÃ TICO%';

-- =============================================
-- PASSO 4: CORREÇÃO - Acentos corrompidos (double-encoded)
-- Padrão: Ã + char especial = acento correto
-- =============================================

-- Ã¡ → á (chr(195) || chr(161) → á)
UPDATE visits 
SET observations = REPLACE(observations, chr(195) || chr(161), 'á')
WHERE observations LIKE '%' || chr(195) || chr(161) || '%';

-- Ã© → é 
UPDATE visits 
SET observations = REPLACE(observations, chr(195) || chr(169), 'é')
WHERE observations LIKE '%' || chr(195) || chr(169) || '%';

-- Ã­ → í
UPDATE visits 
SET observations = REPLACE(observations, chr(195) || chr(173), 'í')
WHERE observations LIKE '%' || chr(195) || chr(173) || '%';

-- Ã³ → ó
UPDATE visits 
SET observations = REPLACE(observations, chr(195) || chr(179), 'ó')
WHERE observations LIKE '%' || chr(195) || chr(179) || '%';

-- Ãº → ú
UPDATE visits 
SET observations = REPLACE(observations, chr(195) || chr(186), 'ú')
WHERE observations LIKE '%' || chr(195) || chr(186) || '%';

-- Ã£ → ã
UPDATE visits 
SET observations = REPLACE(observations, chr(195) || chr(163), 'ã')
WHERE observations LIKE '%' || chr(195) || chr(163) || '%';

-- Ãµ → õ
UPDATE visits 
SET observations = REPLACE(observations, chr(195) || chr(181), 'õ')
WHERE observations LIKE '%' || chr(195) || chr(181) || '%';

-- Ã§ → ç
UPDATE visits 
SET observations = REPLACE(observations, chr(195) || chr(167), 'ç')
WHERE observations LIKE '%' || chr(195) || chr(167) || '%';

COMMIT;

-- =============================================
-- PASSO 5: VERIFICAÇÃO - Confirmar que não há mais padrões corrompidos
-- =============================================
SELECT 
  COUNT(*) as registros_ainda_corrompidos
FROM visits 
WHERE observations IS NOT NULL
  AND (
    observations LIKE '%' || chr(240) || chr(376) || '%'
    OR observations LIKE '%CRÃ TICO%'
    OR observations LIKE '%' || chr(195) || chr(161) || '%'
    OR observations LIKE '%' || chr(195) || chr(169) || '%'
    OR observations LIKE '%' || chr(195) || chr(167) || '%'
  );

-- Se retornar 0 → Tudo corrigido! ✅
-- Se retornar > 0 → Investigar os registros restantes
