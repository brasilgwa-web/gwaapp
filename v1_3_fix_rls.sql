-- FIX v2: Allow updating system roles (but not deleting or creating new system roles)
-- The previous fix blocked updates to is_system=true roles

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read roles" ON roles;
DROP POLICY IF EXISTS "Authenticated can manage roles" ON roles;
DROP POLICY IF EXISTS "Anyone can read role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated can manage role_permissions" ON role_permissions;

-- Read policies
CREATE POLICY "Anyone can read roles" ON roles 
FOR SELECT USING (true);

CREATE POLICY "Anyone can read role_permissions" ON role_permissions 
FOR SELECT USING (true);

-- Allow INSERT only for non-system roles
CREATE POLICY "Authenticated can insert roles" ON roles 
FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND is_system = false);

-- Allow UPDATE for all roles (including system roles - to change permissions)
CREATE POLICY "Authenticated can update roles" ON roles 
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow DELETE only for non-system roles
CREATE POLICY "Authenticated can delete roles" ON roles 
FOR DELETE USING (auth.role() = 'authenticated' AND is_system = false);

-- Role permissions - all operations allowed for authenticated
CREATE POLICY "Authenticated can manage role_permissions" ON role_permissions 
FOR ALL USING (auth.role() = 'authenticated');
