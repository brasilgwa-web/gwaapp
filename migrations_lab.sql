-- Fase 1: Regras de Acesso de Clientes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS view_all_clients BOOLEAN DEFAULT false;

-- Tabela de relacionamento entre usuários e clientes (caso não possam ver todos)
CREATE TABLE IF NOT EXISTS public.user_clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, client_id)
);

ALTER TABLE public.user_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.user_clients FOR ALL USING (auth.role() = 'authenticated');

-- Política RLS na tabela clients para restringir visualização
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem para evitar conflito (opcional, pode falhar se não existir)
-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;

CREATE POLICY "Ver clientes vinculados ou todos se tiver permissao"
ON public.clients
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.view_all_clients = true
    )
    OR 
    EXISTS (
        SELECT 1 FROM public.user_clients 
        WHERE user_clients.user_id = auth.uid() AND user_clients.client_id = clients.id
    )
);

CREATE POLICY "Enable insert for authenticated users" ON public.clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.clients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.clients FOR DELETE USING (auth.role() = 'authenticated');

-- Phase 2: Módulo Laboratório (Registro de Amostras)
CREATE TABLE IF NOT EXISTS public.samples (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
    sample_code VARCHAR(100),
    batch VARCHAR(100), -- Lote analítico
    equipment VARCHAR(200), -- Equipamento/Ponto
    sample_type VARCHAR(100) DEFAULT 'Pontual',
    matrix VARCHAR(100), -- Ex: Água Industrial
    visual_characteristics VARCHAR(255),
    rain_occurrence BOOLEAN DEFAULT false,
    
    -- Cadeia de Custódia: Coleta (Campo)
    collected_at TIMESTAMP WITH TIME ZONE,
    temperature NUMERIC(5,2),
    collection_signature_name VARCHAR(255),
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,

    -- Cadeia de Custódia: Recebimento (Laboratório)
    received_at TIMESTAMP WITH TIME ZONE,
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receipt_integrity VARCHAR(50), -- Conforme / Nao Conforme
    receipt_notes TEXT,

    status VARCHAR(50) DEFAULT 'coletado', -- coletado, recebido, em_analise, concluido
    analyzed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.samples FOR ALL USING (auth.role() = 'authenticated');

-- Trigger para updated_at em samples
CREATE OR REPLACE FUNCTION update_samples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_samples_updated_at
BEFORE UPDATE ON public.samples
FOR EACH ROW
EXECUTE FUNCTION update_samples_updated_at();

-- Criação do perfil 'Laboratório' na tabela roles (caso não exista)
INSERT INTO public.roles (name, description, is_system)
SELECT 'Laboratório', 'Acesso exclusivo para técnicos de laboratório.', false
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'Laboratório');

-- Phase 3: Módulo Laboratório (Matriz de Cálculos Analíticos)
CREATE TABLE IF NOT EXISTS public.sample_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sample_id UUID REFERENCES public.samples(id) ON DELETE CASCADE,
    test_definition_id UUID REFERENCES public.test_definitions(id) ON DELETE CASCADE,
    reading NUMERIC(10,4), -- Leitura bruta do equipamento
    dilution_factor NUMERIC(10,4) DEFAULT 1.0, -- Fator de Diluição
    reagent_factor NUMERIC(10,4) DEFAULT 1.0, -- Fator de Reagente
    correction_factor NUMERIC(10,4) DEFAULT 1.0, -- Fator de Correção
    calculated_result NUMERIC(10,4), -- Resultado Final
    status VARCHAR(50) DEFAULT 'em_analise',
    comments TEXT, -- Banco de comentários
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sample_id, test_definition_id)
);

ALTER TABLE public.sample_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.sample_results FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER trigger_update_sample_results_updated_at
BEFORE UPDATE ON public.sample_results
FOR EACH ROW
EXECUTE FUNCTION update_samples_updated_at();
