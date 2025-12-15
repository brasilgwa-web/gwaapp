-- seed_v1_1_catalog.sql
-- Run this script to populate your database with sample data for testing V1.1 features.

-- 1. Insert Products (Produtos Químicos)
INSERT INTO products (name, unit, min_stock) VALUES
('WG-100 (Inibidor de Corrosão)', 'kg', 50),
('WG-200 (Dispersante)', 'kg', 30),
('WG-BIO (Biocida Não Oxidante)', 'L', 20),
('Hipoclorito de Sódio 12%', 'L', 100),
('Metabissulfito de Sódio', 'kg', 25)
ON CONFLICT DO NOTHING;

-- 2. Insert Observation Templates (Modelos de Texto para Relatório)
INSERT INTO observation_templates (title, content) VALUES
('Caldeira - Condições Normais', 'A caldeira encontra-se operando dentro das faixas recomendadas de controle. Não foram observadas incrustações ou corrosão severa. Recomenda-se manter a rotina de descargas de fundo.'),
('Torre - Alerta Biológico', 'Foi observada formação de limo biológico nas colmeias da torre. Recomendamos aumentar a dosagem de choque do biocida WG-BIO e realizar uma limpeza mecânica na próxima parada.'),
('Sistema Fechado - Nivelação', 'O teor de inibidor no sistema fechado (água gelada) está levemente abaixo do ideal. Foi realizada a reposição de produto durante a visita para restabelecer a proteção anódica.')
ON CONFLICT DO NOTHING;

-- 3. Insert Analysis Groups (Grupos de Análises)
-- Note: We need existing Test Definitions for this. Assuming standard IDs might be tricky if they are UUIDs. 
-- Instead, we will insert some generic Test Definitions first if they don't exist, to ensure the script works standalone.

-- (Optional) Ensure some basic tests exist (using name as "key" logic for this script only)
-- Ideally you already have tests from previous testing. 
-- We will try to fetch IDs for creating groups, but SQL without PL/pgSQL variables is hard for UUIDs.
-- SIMPLIFICATION: I will just create the groups. You will need to add items to them via the UI to test the "Group Selection" fully, 
-- or I can use a subquery if the test names match exactly.

INSERT INTO analysis_groups (name, description) VALUES
('Kit Caldeira Completo', 'pH, Condutividade, Sulfito, Dureza, Alcalinidade, Ferro'),
('Kit Torre de Resfriamento', 'pH, Condutividade, Cloro Livre, Dureza Ca/Mg, Ferro Total')
ON CONFLICT DO NOTHING;

-- Try to link items if tests exist with these exact names
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id
FROM analysis_groups g, test_definitions t
WHERE g.name = 'Kit Caldeira Completo' 
AND t.name IN ('pH', 'Condutividade', 'Sulfito', 'Dureza Total', 'Alcalinidade OH', 'Ferro Total')
ON CONFLICT DO NOTHING;

INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id
FROM analysis_groups g, test_definitions t
WHERE g.name = 'Kit Torre de Resfriamento' 
AND t.name IN ('pH', 'Condutividade', 'Cloro Livre', 'Dureza Total', 'Ferro Total')
ON CONFLICT DO NOTHING;
