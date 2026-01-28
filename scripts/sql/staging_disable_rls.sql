-- ================================================
-- SCRIPT DE POLÍTICAS RLS - STAGING
-- Execute no SQL Editor do Supabase Staging
-- ================================================

-- Desabilitar RLS temporariamente para teste (NÃO FAZER EM PRODUÇÃO)
-- Isso permite que você acesse os dados enquanto configura as policies

-- Opção A: DESABILITAR RLS (mais rápido para testes)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_equipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_dosage_params DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dosage_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_dosages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_equipment_samples DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_sequences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.observation_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_responsibles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_group_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs DISABLE ROW LEVEL SECURITY;

-- ================================================
-- Opção B: CRIAR POLICIES PERMISSIVAS (se quiser RLS habilitado)
-- Descomente abaixo se preferir manter RLS
-- ================================================

/*
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
-- ... (repetir para outras tabelas)

-- Criar policy permissiva para usuários autenticados
CREATE POLICY "Allow authenticated users to read all"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow all operations for authenticated on clients"
ON public.clients FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Repetir para outras tabelas conforme necessário
*/

-- ================================================
-- VERIFICAR SE FUNCIONOU
-- ================================================
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
