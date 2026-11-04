-- ============================================================================
-- MIGRAÇÃO CONSOLIDADA: WGA INTEGRA 360 (PROPOSTAS COMERCIAIS 1 E 2)
-- 100% Aditiva e Retrocompatível (Zero Impacto no que está funcional)
-- ============================================================================

-- 1. Campos de Fator Climático (Chuvas) e Geolocalização (GPS) por Ponto de Coleta
ALTER TABLE public.visit_equipment_samples
ADD COLUMN IF NOT EXISTS weather_condition TEXT,
ADD COLUMN IF NOT EXISTS weather_notes TEXT,
ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_status TEXT,
ADD COLUMN IF NOT EXISTS gps_captured_at TIMESTAMPTZ;

-- 2. Campos de Metadados Regulatórios e Validação Técnica de Laudos na Visita
ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS lab_report_status BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lab_report_url TEXT,
ADD COLUMN IF NOT EXISTS lab_report_comments TEXT,
ADD COLUMN IF NOT EXISTS lab_report_metadata JSONB;

