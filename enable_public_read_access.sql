
-- Permitir LEITURA (SELECT) pública para tabelas usadas no relatório
-- Isso é necessário para que clientes acessem o link do relatório sem login

CREATE POLICY "Public Read Visits" ON public.visits FOR SELECT USING (true);
CREATE POLICY "Public Read Clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public Read Locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Public Read Equipments" ON public.equipments FOR SELECT USING (true);
CREATE POLICY "Public Read Location Equipments" ON public.location_equipments FOR SELECT USING (true);
CREATE POLICY "Public Read Test Definitions" ON public.test_definitions FOR SELECT USING (true);
CREATE POLICY "Public Read Equipment Tests" ON public.equipment_tests FOR SELECT USING (true);
CREATE POLICY "Public Read Test Results" ON public.test_results FOR SELECT USING (true);
CREATE POLICY "Public Read Visit Photos" ON public.visit_photos FOR SELECT USING (true);

-- Nota: Para "profiles", já existe a policy "Public read profiles" no schema original.
