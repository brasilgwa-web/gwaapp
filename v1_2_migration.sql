-- v1_2_migration.sql
-- Refactor: Client Inventory & Equipment Parameters

-- 1. Client Inventory (Estoque do Cliente)
-- Stores the current stock of a product for a specific client.
CREATE TABLE IF NOT EXISTS client_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    
    current_stock NUMERIC DEFAULT 0, -- Estoque Atual em Kg/L
    min_stock NUMERIC DEFAULT 0,     -- Estoque Mínimo para alerta (Overrides product default if needed, or simply acts as the threshold)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(client_id, product_id)
);

-- 2. Equipment Dosage Parameters (Configuração de Dosagem do Equipamento)
-- Defines which products are used by a specific equipment instance and their target dosage.
-- Linked to 'location_equipments' (the specific instance of a boiler/tower at a client).
CREATE TABLE IF NOT EXISTS equipment_dosage_params (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_equipment_id UUID REFERENCES location_equipments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    recommended_dosage NUMERIC,   -- Dosagem Recomendada (ex: 10)
    dosage_unit TEXT,             -- Unidade da dosagem (ex: ppm, g/m3) - Optional, might infer from product or use fixed
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(location_equipment_id, product_id)
);

-- Enable RLS
ALTER TABLE client_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for auth users" ON client_products FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE equipment_dosage_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for auth users" ON equipment_dosage_params FOR ALL USING (auth.role() = 'authenticated');
