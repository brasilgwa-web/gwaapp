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

-- Add RLS policies
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

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'signatures' );
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'signatures' AND auth.role() = 'authenticated' );
