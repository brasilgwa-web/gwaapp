-- PROCUROU PELO RELATÓRIO 2602-000020
-- Este script ajuda a identificar se o item 3DT118 está configurado como teste personalizado

WITH TargetVisit AS (
  SELECT *
  FROM visits
  -- Tenta encontrar pelo número do relatório (conforme mencionado 'visita 2602-000020')
  WHERE report_number = '2602-000020' 
     OR id::text = '2602-000020'
  ORDER BY created_date DESC
  LIMIT 1
)
SELECT 
    v.report_number,
    e.name as equipment_name,
    t.name as test_name,
    tr.measured_value as result_value,
    tr.status_light,
    
    -- 1. Verifica se está na configuração padrão do equipamento
    (SELECT count(*) > 0 FROM equipment_tests et 
     WHERE et.equipment_id = e.id AND et.test_definition_id = t.id
    ) as is_standard_config,

    -- 2. Verifica se está na configuração personalizada do local (ONDE PROVAVELMENTE ESTÁ O ERRO)
    (SELECT count(*) > 0 FROM location_equipment_tests let 
     WHERE let.location_equipment_id = tr.equipment_id AND let.test_definition_id = t.id
    ) as is_custom_config,

    -- 3. Verifica se veio de um Grupo de Análise
    (SELECT count(*) > 0 
     FROM visit_equipment_samples ves
     JOIN analysis_group_items agi ON agi.group_id = ves.analysis_group_id
     WHERE ves.visit_id = v.id AND ves.location_equipment_id = tr.equipment_id AND agi.test_definition_id = t.id
    ) as is_from_group

FROM TargetVisit v
JOIN test_results tr ON tr.visit_id = v.id
JOIN test_definitions t ON t.id = tr.test_definition_id
JOIN location_equipments le ON le.id = tr.equipment_id 
JOIN equipments e ON e.id = le.equipment_id
WHERE t.name LIKE '%3DT118%';
