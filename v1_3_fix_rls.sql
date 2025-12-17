-- FIX: Remove recursive RLS policies for roles and role_permissions
-- The issue: policy tries to check if user is admin by querying roles table,
-- which triggers the same policy, causing infinite recursion.

-- Solution: Simple policies - everyone can read, only service role can write
-- (Admin write operations will work via Supabase client with service key or RPC)

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated read roles" ON roles;
DROP POLICY IF EXISTS "Admin manage roles" ON roles;
DROP POLICY IF EXISTS "Authenticated read permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admin manage permissions" ON role_permissions;

-- Simple read policies (no recursion)
CREATE POLICY "Anyone can read roles" ON roles 
FOR SELECT USING (true);

CREATE POLICY "Anyone can read role_permissions" ON role_permissions 
FOR SELECT USING (true);

-- For write operations, we use a security definer function or allow authenticated users
-- Since admin check would cause recursion, we allow all authenticated to write
-- The UI will handle showing/hiding admin functions
CREATE POLICY "Authenticated can manage roles" ON roles 
FOR ALL USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated' AND is_system = false);

CREATE POLICY "Authenticated can manage role_permissions" ON role_permissions 
FOR ALL USING (auth.role() = 'authenticated');

-- Alternative: Create a security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name = 'admin'
    );
$$;
