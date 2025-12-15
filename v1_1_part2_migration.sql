-- v1_1_part2_migration.sql

-- New table to store metadata for a specific equipment in a visit
-- This handles "Hora da Coleta", "Análises Complementares", and remembering the "Analysis Group"
CREATE TABLE IF NOT EXISTS visit_equipment_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    location_equipment_id UUID REFERENCES location_equipments(id) ON DELETE CASCADE, -- The specific instance of the equipment
    collection_time TIME,
    complementary_info TEXT, -- "Análises Complementares"
    analysis_group_id UUID REFERENCES analysis_groups(id), -- Optional: remember which group was used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(visit_id, location_equipment_id)
);

ALTER TABLE visit_equipment_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users" ON visit_equipment_samples FOR ALL USING (auth.role() = 'authenticated');
