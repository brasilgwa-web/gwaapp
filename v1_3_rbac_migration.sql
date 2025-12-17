-- V1.3 RBAC Migration: Role-Based Access Control
-- Run this in Supabase SQL Editor

-- =====================================================
-- STEP 1: Create roles table
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE, -- admin/tecnico cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Create role_permissions table
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    route_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, route_key)
);

-- =====================================================
-- STEP 3: Seed default roles
-- =====================================================
INSERT INTO roles (name, description, is_system) VALUES
    ('admin', 'Administrador do sistema - acesso total', TRUE),
    ('tecnico', 'Técnico de campo - acesso básico', TRUE)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- =====================================================
-- STEP 4: Seed permissions for admin (all routes)
-- =====================================================
INSERT INTO role_permissions (role_id, route_key)
SELECT r.id, route_key 
FROM roles r
CROSS JOIN (VALUES 
    ('dashboard'),
    ('visits'),
    ('setup_clients'),
    ('setup_equipments'),
    ('setup_tests'),
    ('setup_products'),
    ('setup_templates'),
    ('admin_users'),
    ('admin_ai'),
    ('admin_roles')
) AS routes(route_key)
WHERE r.name = 'admin'
ON CONFLICT (role_id, route_key) DO NOTHING;

-- =====================================================
-- STEP 5: Seed permissions for tecnico (basic routes)
-- =====================================================
INSERT INTO role_permissions (role_id, route_key)
SELECT r.id, route_key 
FROM roles r
CROSS JOIN (VALUES 
    ('dashboard'),
    ('visits')
) AS routes(route_key)
WHERE r.name = 'tecnico'
ON CONFLICT (role_id, route_key) DO NOTHING;

-- =====================================================
-- STEP 6: Add role_id column to profiles (migrate from text role)
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

-- Migrate existing text roles to role_id
UPDATE profiles p
SET role_id = r.id
FROM roles r
WHERE p.role = r.name AND p.role_id IS NULL;

-- Set default role (tecnico) for users without role
UPDATE profiles p
SET role_id = (SELECT id FROM roles WHERE name = 'tecnico')
WHERE p.role_id IS NULL;

-- =====================================================
-- STEP 7: Enable RLS on new tables
-- =====================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles and permissions
DROP POLICY IF EXISTS "Authenticated read roles" ON roles;
CREATE POLICY "Authenticated read roles" ON roles 
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated read permissions" ON role_permissions;
CREATE POLICY "Authenticated read permissions" ON role_permissions 
FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can modify roles
DROP POLICY IF EXISTS "Admin manage roles" ON roles;
CREATE POLICY "Admin manage roles" ON roles 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        JOIN roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
);

-- Only admins can modify permissions
DROP POLICY IF EXISTS "Admin manage permissions" ON role_permissions;
CREATE POLICY "Admin manage permissions" ON role_permissions 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        JOIN roles r ON p.role_id = r.id 
        WHERE p.id = auth.uid() AND r.name = 'admin'
    )
);

-- =====================================================
-- View to easily get user with role and permissions
-- =====================================================
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    r.id as role_id,
    r.name as role_name,
    r.is_system as role_is_system,
    ARRAY_AGG(rp.route_key) as permissions
FROM profiles p
LEFT JOIN roles r ON p.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY p.id, p.email, p.full_name, r.id, r.name, r.is_system;
