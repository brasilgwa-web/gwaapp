-- Create client_contacts table
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

-- Policies (Adjust based on your actual auth requirements)
-- Assuming authenticated users (technicians/admins) can read/write
CREATE POLICY "Enable all access for authenticated users" ON client_contacts
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Optional: If you use specific roles, adjust above.
