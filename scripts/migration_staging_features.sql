-- Migration for Commercial Proposal Features (Staging)
-- 1. Client Specific Tests (Technology Chemical)
-- 2. Stock Access Control

-- A. Table for Client-Specific Tests (Overrides/Additions to Standard Equipment Tests)
CREATE TABLE IF NOT EXISTS location_equipment_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_equipment_id UUID NOT NULL REFERENCES location_equipments(id) ON DELETE CASCADE,
    test_definition_id UUID NOT NULL REFERENCES test_definitions(id) ON DELETE RESTRICT,
    min_value NUMERIC(10,2),
    max_value NUMERIC(10,2),
    unit TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for location_equipment_tests
ALTER TABLE location_equipment_tests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'location_equipment_tests' AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON location_equipment_tests
            FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- B. Stock Access Flag on Clients
-- We use DO block to avoid error if column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'has_stock_access'
    ) THEN 
        ALTER TABLE clients
        ADD COLUMN has_stock_access BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
