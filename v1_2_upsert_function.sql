-- Create a reliable upsert function using PostgreSQL's native ON CONFLICT
-- This bypasses Supabase REST API quirks

CREATE OR REPLACE FUNCTION upsert_test_result(
  p_visit_id UUID,
  p_equipment_id UUID,
  p_test_definition_id UUID,
  p_measured_value NUMERIC,
  p_status_light TEXT
) RETURNS TABLE (
  visit_id UUID,
  equipment_id UUID,
  test_definition_id UUID,
  measured_value NUMERIC,
  status_light TEXT
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO test_results (visit_id, equipment_id, test_definition_id, measured_value, status_light, created_date, updated_date)
  VALUES (p_visit_id, p_equipment_id, p_test_definition_id, p_measured_value, p_status_light, NOW(), NOW())
  ON CONFLICT (visit_id, equipment_id, test_definition_id) 
  DO UPDATE SET 
    measured_value = EXCLUDED.measured_value, 
    status_light = EXCLUDED.status_light,
    updated_date = NOW()
  RETURNING test_results.visit_id, test_results.equipment_id, test_results.test_definition_id, 
            test_results.measured_value, test_results.status_light;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_test_result TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_test_result TO anon;
