-- =====================================================
-- INVESTIGAÇÃO: Cliente com "WHITE" no nome desapareceu
-- Execute cada bloco separadamente no SQL Editor do Supabase
-- =====================================================

-- 1. VERIFICAR SE O CLIENTE AINDA EXISTE (caso tenha sido renomeado)
SELECT id, name, email, city_state, created_date, updated_date, created_by, created_by_id
FROM clients 
WHERE name ILIKE '%white%';

-- 2. BUSCAR NOS SYSTEM_LOGS qualquer operação de DELETE em clients
-- (O sistema registra logs via OperationFeedbackContext)
SELECT 
    sl.created_at AS "Data/Hora",
    sl.level,
    sl.message,
    sl.details,
    sl.user_id,
    p.full_name AS "Usuário",
    p.email AS "Email do Usuário"
FROM system_logs sl
LEFT JOIN profiles p ON p.id = sl.user_id
WHERE sl.details->>'entity' = 'client'
  AND sl.details->>'action' = 'delete'
ORDER BY sl.created_at DESC;

-- 3. BUSCAR NOS LOGS qualquer menção a "white" (caso esteja nos details)
SELECT 
    sl.created_at AS "Data/Hora",
    sl.level,
    sl.category,
    sl.message,
    sl.details,
    sl.user_id,
    p.full_name AS "Usuário",
    p.email AS "Email do Usuário"
FROM system_logs sl
LEFT JOIN profiles p ON p.id = sl.user_id
WHERE sl.details::text ILIKE '%white%'
   OR sl.message ILIKE '%white%'
ORDER BY sl.created_at DESC;

-- 4. VERIFICAR TABELAS RELACIONADAS (vestígios do cliente)
-- Se o cliente foi deletado, referências em visits/locations podem ter sido apagadas em cascata
-- Mas podemos buscar em visit logs ou test_results por referências órfãs

-- 4a. Verificar se existem locations órfãs (sem client_id válido)
SELECT l.* 
FROM locations l
LEFT JOIN clients c ON c.id = l.client_id
WHERE c.id IS NULL;

-- 4b. Verificar se existem visits órfãs
SELECT v.id, v.visit_date, v.client_id, v.status, v.created_by, v.created_date
FROM visits v
LEFT JOIN clients c ON c.id = v.client_id
WHERE c.id IS NULL;

-- 5. BUSCAR TODOS OS LOGS DE DELETE (qualquer entidade) nos últimos 30 dias
SELECT 
    sl.created_at AS "Data/Hora",
    sl.message,
    sl.details->>'entity' AS "Entidade",
    sl.details->>'action' AS "Ação",
    sl.details->>'id' AS "ID Deletado",
    p.full_name AS "Usuário",
    p.email AS "Email"
FROM system_logs sl
LEFT JOIN profiles p ON p.id = sl.user_id
WHERE sl.details->>'action' = 'delete'
  AND sl.created_at >= NOW() - INTERVAL '30 days'
ORDER BY sl.created_at DESC;

-- 6. VERIFICAR LOGS DO SUPABASE AUTH (quem acessou o sistema recentemente)
-- Isso usa a tabela auth.audit_log_entries do Supabase
SELECT 
    id,
    created_at,
    ip_address,
    payload->>'action' as action,
    payload->>'actor_id' as actor_id
FROM auth.audit_log_entries
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 50;
