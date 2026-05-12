-- Migration: Add chart_color column to test_definitions
-- Each test gets a fixed color for consistent chart appearance across all equipment

ALTER TABLE test_definitions
ADD COLUMN IF NOT EXISTS chart_color TEXT DEFAULT NULL;

-- Comment explaining the column
COMMENT ON COLUMN test_definitions.chart_color IS 'Hex color code for chart lines (e.g. #2563eb). When set, this color is used consistently across all charts for this test parameter.';
