-- V1.2 Part 6: Add default Analysis Group to Equipment
-- This allows equipment to have a pre-selected analysis group

ALTER TABLE location_equipments 
ADD COLUMN IF NOT EXISTS default_analysis_group_id UUID REFERENCES analysis_groups(id);

-- Comment: When a visit is created, the equipment's default analysis group 
-- will be used to auto-load the tests for that equipment.
