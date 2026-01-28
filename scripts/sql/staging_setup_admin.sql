-- ================================================
-- CONFIGURAR PERMISSÕES ADMIN NO STAGING
-- Execute no SQL Editor do Supabase Staging
-- ================================================

-- 1. Ver roles existentes
SELECT * FROM roles;

-- 2. Ver seu profile
SELECT * FROM profiles;

-- 3. Pegar o ID da role admin
-- (se não existir, criar)
INSERT INTO roles (name, description, is_system)
VALUES ('admin', 'Administrador do sistema', true)
ON CONFLICT (name) DO NOTHING;

-- 4. Adicionar TODAS as permissões para a role admin
WITH admin_role AS (
    SELECT id FROM roles WHERE name = 'admin' LIMIT 1
)
INSERT INTO role_permissions (role_id, route_key)
SELECT admin_role.id, perm
FROM admin_role, (VALUES 
    ('dashboard'),
    ('visits'),
    ('setup_clients'),
    ('setup_equipments'),
    ('setup_tests'),
    ('setup_products'),
    ('setup_templates'),
    ('admin_users'),
    ('admin_ai'),
    ('admin_report'),
    ('admin_roles')
) AS perms(perm)
ON CONFLICT DO NOTHING;

-- 5. Atualizar seu perfil para usar a role admin
-- SUBSTITUA 'seu@email.com' pelo seu email real
UPDATE profiles 
SET 
    role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
    role = 'admin',
    status = 'active'
WHERE email = 'andre.lsarruda@gmail.com';

-- ================================================
-- VERIFICAÇÃO
-- ================================================

-- Ver permissões do admin
SELECT r.name as role_name, rp.route_key 
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.name = 'admin';

-- Ver seu perfil atualizado
SELECT id, email, full_name, role, status, role_id FROM profiles;
