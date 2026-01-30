-- Migration for Enhanced Multi-Contact Support

-- 0. Ensure table exists (features might have been dropped)
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Add receive_email to client_contacts
ALTER TABLE client_contacts 
ADD COLUMN IF NOT EXISTS receive_email BOOLEAN DEFAULT TRUE;

-- 2. Add client_contact_id to visits (to track who signed)
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS client_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL;

-- 3. Policy update
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'client_contacts' AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON client_contacts
            FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
