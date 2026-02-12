-- 1. Get Equipment ID for "Caldeira a Lenha"
SELECT * FROM equipments WHERE name ILIKE '%Caldeira a Lenha%';

-- 2. Get Standard Tests for this Equipment (assuming ID found in step 1, let's say we find it and use it in next queries)
-- Replace EQUIPMENT_ID with actual ID after running first query, or use join
SELECT 
    et.id as link_id,
    e.name as equipment_name,
    td.name as test_name,
    et.min_value,
    et.max_value,
    et.unit
FROM equipment_tests et
JOIN equipments e ON e.id = et.equipment_id
JOIN test_definitions td ON td.id = et.test_definition_id
WHERE e.name ILIKE '%Caldeira a Lenha%';

-- 3. Check for specific Location Overrides
SELECT 
    let.id as override_id,
    l.name as location_name,
    e.name as equipment_name,
    td.name as test_name,
    let.min_value as override_min,
    let.max_value as override_max
FROM location_equipment_tests let
JOIN location_equipments le ON le.id = let.location_equipment_id
JOIN locations l ON l.id = le.location_id
JOIN equipments e ON e.id = le.equipment_id
JOIN test_definitions td ON td.id = let.test_definition_id
WHERE e.name ILIKE '%Caldeira a Lenha%';
