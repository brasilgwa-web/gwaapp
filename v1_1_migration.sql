-- Version 1.1 Migration Script

-- Enable UUID extension if not enabled (should be already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients Updates
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_code TEXT;
ALTER TABLE clients ALTER COLUMN cnpj DROP NOT NULL;

-- 2. Locations/Equipments Updates
-- We are treating 'locations' as the table for Equipments/Assets.
ALTER TABLE locations ADD COLUMN IF NOT EXISTS default_discharges_drainages TEXT;

-- 3. Test Definitions Updates (Laboratory Parameters)
ALTER TABLE test_definitions ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE test_definitions ADD COLUMN IF NOT EXISTS dilution_factor NUMERIC DEFAULT 1;
ALTER TABLE test_definitions ADD COLUMN IF NOT EXISTS ld TEXT; -- Limit of Detection
ALTER TABLE test_definitions ADD COLUMN IF NOT EXISTS lq TEXT; -- Limit of Quantification
ALTER TABLE test_definitions ADD COLUMN IF NOT EXISTS method_uncertainty TEXT;
ALTER TABLE test_definitions ADD COLUMN IF NOT EXISTS methodology TEXT; -- ISO/SMEWW Standard

-- 4. Visits Updates
ALTER TABLE visits ADD COLUMN IF NOT EXISTS service_start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS service_end_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS discharges_drainages TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS report_number TEXT; -- E{YY}{MM}{Seq}

-- 5. New Tables

-- Products Catalog
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dosage Plans (Equipment/Location + Product)
CREATE TABLE IF NOT EXISTS dosage_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    current_stock_qty NUMERIC,
    dosage_target TEXT, -- e.g. "10kg/sem" or "5 Litros"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis Groups (Predefined sets of tests)
CREATE TABLE IF NOT EXISTS analysis_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis Group Items
CREATE TABLE IF NOT EXISTS analysis_group_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES analysis_groups(id) ON DELETE CASCADE,
    test_definition_id UUID REFERENCES test_definitions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Observation Templates (Standard texts for reports)
CREATE TABLE IF NOT EXISTS observation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Sequences (for managing E-YY-MM-XXXX)
CREATE TABLE IF NOT EXISTS report_sequences (
    year_month TEXT PRIMARY KEY, -- Format: "YYYYMM"
    current_count INTEGER DEFAULT 0
);

-- RLS Policies for new tables (Public access for simplicity as requested, or Authenticated)
-- Assuming the app uses authenticated access mostly, but we'll enable RLS and add policies matching existing logic.

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users" ON products FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE dosage_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users" ON dosage_plans FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE analysis_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users" ON analysis_groups FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE analysis_group_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users" ON analysis_group_items FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE observation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users" ON observation_templates FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE report_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for authenticated users" ON report_sequences FOR ALL USING (auth.role() = 'authenticated');
