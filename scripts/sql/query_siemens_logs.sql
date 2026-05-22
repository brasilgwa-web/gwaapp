-- Consulta de logs de cadastro ou update de equipamentos/testes para o cliente "Siemens"

-- 1. Buscar pelo ID do cliente que contenha "Siemens" no nome
WITH siemens_client AS (
    SELECT id FROM clients 
    WHERE fantasy_name ILIKE '%Siemens%' OR company_name ILIKE '%Siemens%'
    LIMIT 1
),
-- 2. Buscar as locations vinculadas a esse cliente
siemens_locations AS (
    SELECT id FROM locations WHERE client_id IN (SELECT id FROM siemens_client)
),
-- 3. Buscar os location_equipments vinculados a essas locations
siemens_equipments AS (
    SELECT id FROM location_equipments WHERE location_id IN (SELECT id FROM siemens_locations)
)
-- 4. Na tabela system_logs verificar:
-- a) Se a mensagem ou detalhes citam Siemens (logs genéricos ou relatórios)
-- b) Se o log é da entidade location_equipment e o id bate com um dos equipamentos do cliente
-- c) Se o log é da entidade location_equipment_test ou equipment_dosage_params 
--    e o location_equipment_id bate com os do cliente
SELECT 
    sl.created_at,
    sl.category,
    sl.message,
    sl.details,
    u.email as usuario
FROM system_logs sl
LEFT JOIN auth.users u ON sl.user_id = u.id
WHERE 
    -- Texto livre
    sl.message ILIKE '%Siemens%'
    OR sl.details::text ILIKE '%Siemens%'
    -- Especifico de cadastro/update de equipamentos no cliente
    OR (
        sl.details->>'entity' = 'location_equipment' 
        AND (sl.details->>'id')::uuid IN (SELECT id FROM siemens_equipments)
    )
    -- Especifico de testes customizados (location_equipment_test) ou produtos (equipment_dosage_params)
    OR (
        sl.details->>'entity' IN ('location_equipment_test', 'equipment_dosage_params') 
        AND (sl.details->'data'->>'location_equipment_id')::uuid IN (SELECT id FROM siemens_equipments)
    )
ORDER BY sl.created_at DESC;
