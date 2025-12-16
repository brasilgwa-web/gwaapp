-- Seed Data: Test Definitions, Analysis Groups, and Associations
-- Based on "Grupo de análises de rotina" table

-- ============================================
-- NOTE: We are NOT deleting existing data to avoid FK violations
-- This script only ADDS new data if it doesn't exist
-- ============================================

-- ============================================
-- 2. INSERT TEST DEFINITIONS (Parâmetros de Análise)
-- ============================================
INSERT INTO test_definitions (id, name, unit, min_value, max_value, methodology, ld, lq, method_uncertainty) VALUES
    (gen_random_uuid(), 'pH', 'pH', 6.5, 8.5, 'SMEWW 4500-H+B', '0.01', '0.1', '± 0.1'),
    (gen_random_uuid(), 'Alcalinidade Total', 'mg/L CaCO3', 0, 500, 'SMEWW 2320B', '1', '5', '± 5%'),
    (gen_random_uuid(), 'Alcalinidade OH', 'mg/L CaCO3', 0, 100, 'SMEWW 2320B', '1', '5', '± 5%'),
    (gen_random_uuid(), 'Cloretos', 'mg/L Cl-', 0, 250, 'SMEWW 4500-Cl-B', '1', '5', '± 3%'),
    (gen_random_uuid(), 'Dureza Cálcio', 'mg/L CaCO3', 0, 500, 'SMEWW 2340C', '1', '5', '± 5%'),
    (gen_random_uuid(), 'Dureza Total', 'mg/L CaCO3', 0, 500, 'SMEWW 2340C', '1', '5', '± 5%'),
    (gen_random_uuid(), 'STD (Sólidos Totais Dissolvidos)', 'mg/L', 0, 1000, 'SMEWW 2540C', '5', '10', '± 3%'),
    (gen_random_uuid(), 'Condutividade', 'µS/cm', 0, 2500, 'SMEWW 2510B', '1', '5', '± 2%'),
    (gen_random_uuid(), 'E. Coli', 'UFC/100mL', 0, 0, 'SMEWW 9223B', '-', '1', 'Presença/Ausência'),
    (gen_random_uuid(), 'Coliformes Totais', 'UFC/100mL', 0, 0, 'SMEWW 9223B', '-', '1', 'Presença/Ausência'),
    (gen_random_uuid(), 'Bactérias Aeróbicas Totais', 'UFC/mL', 0, 500, 'SMEWW 9215B', '-', '1', '± 10%'),
    (gen_random_uuid(), 'Cloro Residual Livre', 'mg/L Cl2', 0.2, 2.0, 'SMEWW 4500-Cl G', '0.01', '0.05', '± 5%'),
    (gen_random_uuid(), 'Turbidez', 'NTU', 0, 5, 'SMEWW 2130B', '0.1', '0.5', '± 5%'),
    (gen_random_uuid(), 'Cor Aparente', 'uH', 0, 15, 'SMEWW 2120B', '1', '5', '± 5%'),
    (gen_random_uuid(), 'Ferro Total', 'mg/L Fe', 0, 0.3, 'SMEWW 3500-Fe B', '0.01', '0.05', '± 5%'),
    (gen_random_uuid(), 'Sílica', 'mg/L SiO2', 0, 50, 'SMEWW 4500-SiO2 C', '0.5', '1', '± 5%'),
    (gen_random_uuid(), 'Fosfato', 'mg/L PO4', 0, 20, 'SMEWW 4500-P E', '0.1', '0.5', '± 5%'),
    (gen_random_uuid(), 'Sulfito', 'mg/L SO3', 0, 50, 'SMEWW 4500-SO3 B', '1', '5', '± 5%'),
    (gen_random_uuid(), 'Hidrazina', 'ppb N2H4', 0, 200, 'ASTM D1385', '1', '10', '± 10%'),
    (gen_random_uuid(), 'Jar-Teste pH', 'pH', 6.0, 9.0, 'Jar-Test', '-', '-', '-'),
    (gen_random_uuid(), 'Jar-Teste Turbidez', 'NTU', 0, 100, 'Jar-Test', '-', '-', '-'),
    (gen_random_uuid(), 'RTC (Contagem Total)', 'Ciclos', 0, 10, 'Interno', '-', '-', '-')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. INSERT ANALYSIS GROUPS
-- ============================================
INSERT INTO analysis_groups (id, name, description) VALUES
    (gen_random_uuid(), 'Grupo 1 - Caldeira Básico', 'pH, Alcalinidade Total, Cloretos, Dureza Cálcio, STD, Condutividade'),
    (gen_random_uuid(), 'Grupo 2 - Caldeira Completo', 'pH, Alcalinidade OH/TT, Cloretos, Dureza Total, STD, Condutividade'),
    (gen_random_uuid(), 'Grupo 3 - Torre Resfriamento', 'pH, Cloretos, Dureza Total, STD, Condutividade'),
    (gen_random_uuid(), 'Grupo 4 - Rotina Mínima', 'pH, STD, Condutividade'),
    (gen_random_uuid(), 'Grupo 5 - Microbiológico', 'E.Coli, Coliformes Totais, Bactérias Aeróbicas Totais'),
    (gen_random_uuid(), 'Grupo 6 - Potável Simplificado', 'Verificação simplificada de potabilidade'),
    (gen_random_uuid(), 'Grupo 7 - RTC', 'Análise de RTC'),
    (gen_random_uuid(), 'Grupo 8 - Jar-Teste', 'Testes de Jar-Test'),
    (gen_random_uuid(), 'Grupo 9 - Outros', 'Análises diversas')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. INSERT ANALYSIS GROUP ITEMS (Associations)
-- ============================================

-- Grupo 1: pH, Alcalinidade Total, Cloretos, Dureza Cálcio, STD, Condutividade
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id FROM analysis_groups g, test_definitions t
WHERE g.name = 'Grupo 1 - Caldeira Básico' AND t.name IN ('pH', 'Alcalinidade Total', 'Cloretos', 'Dureza Cálcio', 'STD (Sólidos Totais Dissolvidos)', 'Condutividade')
ON CONFLICT DO NOTHING;

-- Grupo 2: pH, Alcalinidade OH, Alcalinidade Total, Cloretos, Dureza Total, STD, Condutividade
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id FROM analysis_groups g, test_definitions t
WHERE g.name = 'Grupo 2 - Caldeira Completo' AND t.name IN ('pH', 'Alcalinidade OH', 'Alcalinidade Total', 'Cloretos', 'Dureza Total', 'STD (Sólidos Totais Dissolvidos)', 'Condutividade')
ON CONFLICT DO NOTHING;

-- Grupo 3: pH, Cloretos, Dureza Total, STD, Condutividade
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id FROM analysis_groups g, test_definitions t
WHERE g.name = 'Grupo 3 - Torre Resfriamento' AND t.name IN ('pH', 'Cloretos', 'Dureza Total', 'STD (Sólidos Totais Dissolvidos)', 'Condutividade')
ON CONFLICT DO NOTHING;

-- Grupo 4: pH, STD, Condutividade
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id FROM analysis_groups g, test_definitions t
WHERE g.name = 'Grupo 4 - Rotina Mínima' AND t.name IN ('pH', 'STD (Sólidos Totais Dissolvidos)', 'Condutividade')
ON CONFLICT DO NOTHING;

-- Grupo 5: E.Coli, Coliformes Totais, Bactérias Aeróbicas Totais
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id FROM analysis_groups g, test_definitions t
WHERE g.name = 'Grupo 5 - Microbiológico' AND t.name IN ('E. Coli', 'Coliformes Totais', 'Bactérias Aeróbicas Totais')
ON CONFLICT DO NOTHING;

-- Grupo 6: Potável Simplificado - pH, Cloro, Turbidez, Cor, E.Coli, Coliformes
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id FROM analysis_groups g, test_definitions t
WHERE g.name = 'Grupo 6 - Potável Simplificado' AND t.name IN ('pH', 'Cloro Residual Livre', 'Turbidez', 'Cor Aparente', 'E. Coli', 'Coliformes Totais')
ON CONFLICT DO NOTHING;

-- Grupo 7: RTC
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id FROM analysis_groups g, test_definitions t
WHERE g.name = 'Grupo 7 - RTC' AND t.name = 'RTC (Contagem Total)'
ON CONFLICT DO NOTHING;

-- Grupo 8: Jar-Teste
INSERT INTO analysis_group_items (group_id, test_definition_id)
SELECT g.id, t.id FROM analysis_groups g, test_definitions t
WHERE g.name = 'Grupo 8 - Jar-Teste' AND t.name IN ('Jar-Teste pH', 'Jar-Teste Turbidez')
ON CONFLICT DO NOTHING;

-- Grupo 9: Outros - deixar vazio ou adicionar conforme necessário

-- ============================================
-- 5. VERIFICATION QUERIES (Run to check)
-- ============================================
-- SELECT name FROM test_definitions ORDER BY name;
-- SELECT name FROM analysis_groups ORDER BY name;
-- SELECT g.name as grupo, t.name as teste 
-- FROM analysis_group_items agi 
-- JOIN analysis_groups g ON agi.group_id = g.id 
-- JOIN test_definitions t ON agi.test_definition_id = t.id 
-- ORDER BY g.name, t.name;
