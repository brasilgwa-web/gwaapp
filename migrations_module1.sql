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

-- Remove políticas antigas se existirem para evitar conflito (execute no dashboard se necessario)
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
