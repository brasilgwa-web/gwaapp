-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Add the missing signature_url column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS signature_url text;

-- 2. Allow users to update their OWN profile (currently only admins can)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. Ensure they can read their own profile (already covered by public read, but good to be safe)
-- (Existing policy "Public read profiles" covers selects)
