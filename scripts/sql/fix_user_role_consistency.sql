-- Fix: sincroniza o campo 'role' direto com o nome da role via role_id FK
-- Usuários que têm role_id mas field 'role' com valor diferente do esperado

-- 1. Ver usuários com inconsistência antes do fix
SELECT 
    p.email,
    p.role AS role_direto,
    r.name AS role_via_fk
FROM profiles p
LEFT JOIN roles r ON r.id = p.role_id
WHERE p.role_id IS NOT NULL AND p.role != r.name;

-- 2. Aplicar o fix: atualizar o campo 'role' para bater com o role_id FK
UPDATE profiles p
SET role = r.name
FROM roles r
WHERE p.role_id = r.id
  AND p.role != r.name;

-- 3. Confirmar correção
SELECT email, role, role_id FROM profiles WHERE email = 'deco260483@gmail.com';
