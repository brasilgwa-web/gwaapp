-- Create 'public' bucket for general assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'uploads' bucket as fallback (since the code checks for it)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- ALLOW PUBLIC READ ACCESS (Essential for logos to appear in reports)
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('public', 'uploads') );

-- ALLOW UPLOAD ACCESS (Authenticated users)
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id IN ('public', 'uploads') );

-- ALLOW UPDATE/DELETE (Optional, for managing files)
DROP POLICY IF EXISTS "Authenticated Manage Access" ON storage.objects;
CREATE POLICY "Authenticated Manage Access"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id IN ('public', 'uploads') );
