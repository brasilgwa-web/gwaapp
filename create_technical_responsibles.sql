-- Create technical_responsibles table
CREATE TABLE IF NOT EXISTS technical_responsibles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    crq TEXT NOT NULL,
    signature_url TEXT,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies (Check if they exist first or drop them to be safe, but IF NOT EXISTS isn't standard for policies)
-- Doing DROP IF EXISTS is safer for re-running
DROP POLICY IF EXISTS "Enable read access for all users" ON technical_responsibles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON technical_responsibles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON technical_responsibles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON technical_responsibles;

ALTER TABLE technical_responsibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON technical_responsibles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON technical_responsibles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON technical_responsibles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON technical_responsibles
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create storage bucket for signatures if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies - using specific names to avoid "relation already exists" errors with generic names
DROP POLICY IF EXISTS "Signatures Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Signatures Auth Upload" ON storage.objects;

CREATE POLICY "Signatures Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'signatures' );
CREATE POLICY "Signatures Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'signatures' AND auth.role() = 'authenticated' );
