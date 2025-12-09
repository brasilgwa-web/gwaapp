
-- Run this in your Supabase SQL Editor to grant admin rights to your user

-- 1. Ensure the profile exists (trigger should have handled this, but just in case)
INSERT INTO public.profiles (id, email, full_name, role, status)
SELECT id, email, raw_user_meta_data->>'full_name', 'admin', 'active'
FROM auth.users
WHERE email = 'andre.lsarruda@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin', status = 'active';

-- 2. Verify the result
SELECT * FROM public.profiles WHERE email = 'andre.lsarruda@gmail.com';
