
-- 1. Create a public storage bucket named 'uploads' (or 'public' as per code, let's stick to 'public' to match code, but 'uploads' is cleaner. Code says 'public')
-- Code uses: .from('public')

INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create policies to allow access
-- Allow public access to view files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'public' );

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'public' );

-- Allow authenticated users to update their own files (optional)
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'public' );

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'public' );
