-- v1_1_part3_migration.sql

-- Table to store actual dosages and stock levels recorded during a visit
-- Linked to a specific Equipment Instance (LocationEquipment) and a Product
CREATE TABLE IF NOT EXISTS visit_dosages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    location_equipment_id UUID REFERENCES location_equipments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    current_stock NUMERIC, -- Estoque Atual
    dosage_applied NUMERIC, -- Dosagem (Quantidade aplicada/do dia)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per product per equipment per visit
    UNIQUE(visit_id, location_equipment_id, product_id)
);

ALTER TABLE visit_dosages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users" ON visit_dosages FOR ALL USING (auth.role() = 'authenticated');
