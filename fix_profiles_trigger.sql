-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create the function to handle new user signed up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger (if it doesn't verify already)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. CRITICAL: Backfill existing users into profiles (Insert if not exists)
INSERT INTO public.profiles (id, email, full_name, role, status)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    'user',
    'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
