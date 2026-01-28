/**
 * Script para copiar dados de PRODUÇÃO para STAGING
 * Execute com: node scripts/copy-data-to-staging.cjs
 */

const { createClient } = require('@supabase/supabase-js');

// PRODUÇÃO
const PROD_URL = 'https://uaqjbdxntuchphtsbkyd.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg';

// STAGING
const STAGING_URL = 'https://jdkkykervzjrubcjibfu.supabase.co';
const STAGING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impka2t5a2VydnpqcnViY2ppYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDUwNTQsImV4cCI6MjA4NTE4MTA1NH0.jj0iDiZ3128xWAvOXsxXCsC2NUnwcV6ilIfur6_HUdA';

const prodClient = createClient(PROD_URL, PROD_KEY);
const stagingClient = createClient(STAGING_URL, STAGING_KEY);

// Ordem das tabelas respeitando dependências (tabelas pai primeiro)
const TABLES_ORDER = [
    'roles',
    'ai_settings',
    'products',
    'analysis_groups',
    'report_sequences',
    'report_settings',
    'observation_templates',
    'technical_responsibles',
    'equipments',
    'test_definitions',
    // profiles depende de auth.users que não podemos copiar facilmente
    'role_permissions',
    'clients',
    'equipment_tests',
    'analysis_group_items',
    // 'system_logs', // não precisa copiar logs
    'locations',
    'client_products',
    'location_equipments',
    'dosage_plans',
    'visits',
    'equipment_dosage_params',
    'test_results',
    'visit_dosages',
    'visit_equipment_samples',
    'visit_photos',
];

async function copyTable(tableName) {
    console.log(`\n📋 Copiando tabela: ${tableName}...`);

    try {
        // Buscar dados da produção
        const { data: prodData, error: prodError } = await prodClient
            .from(tableName)
            .select('*');

        if (prodError) {
            console.log(`  ⚠️  Erro ao ler ${tableName}: ${prodError.message}`);
            return { table: tableName, copied: 0, error: prodError.message };
        }

        if (!prodData || prodData.length === 0) {
            console.log(`  ⏩ Tabela ${tableName} está vazia, pulando...`);
            return { table: tableName, copied: 0 };
        }

        console.log(`  📥 ${prodData.length} registros encontrados`);

        // Inserir em lotes de 100 para evitar timeout
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < prodData.length; i += batchSize) {
            const batch = prodData.slice(i, i + batchSize);

            const { error: insertError } = await stagingClient
                .from(tableName)
                .upsert(batch, {
                    onConflict: 'id',
                    ignoreDuplicates: true
                });

            if (insertError) {
                console.log(`  ⚠️  Erro ao inserir em ${tableName}: ${insertError.message}`);
                // Tentar inserir um por um para identificar problemas
                for (const item of batch) {
                    const { error: singleError } = await stagingClient
                        .from(tableName)
                        .upsert(item, { onConflict: 'id', ignoreDuplicates: true });
                    if (!singleError) inserted++;
                }
            } else {
                inserted += batch.length;
            }
        }

        console.log(`  ✅ ${inserted}/${prodData.length} registros copiados`);
        return { table: tableName, copied: inserted, total: prodData.length };

    } catch (err) {
        console.log(`  ❌ Erro inesperado em ${tableName}: ${err.message}`);
        return { table: tableName, copied: 0, error: err.message };
    }
}

async function main() {
    console.log('='.repeat(50));
    console.log('🚀 CÓPIA DE DADOS: PRODUÇÃO → STAGING');
    console.log('='.repeat(50));
    console.log(`Produção: ${PROD_URL}`);
    console.log(`Staging: ${STAGING_URL}`);
    console.log('='.repeat(50));

    const results = [];

    for (const table of TABLES_ORDER) {
        const result = await copyTable(table);
        results.push(result);
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DA CÓPIA');
    console.log('='.repeat(50));

    let totalCopied = 0;
    let totalRecords = 0;

    for (const r of results) {
        const status = r.error ? '❌' : (r.copied > 0 ? '✅' : '⏩');
        console.log(`${status} ${r.table}: ${r.copied || 0}${r.total ? `/${r.total}` : ''} registros`);
        totalCopied += r.copied || 0;
        totalRecords += r.total || 0;
    }

    console.log('='.repeat(50));
    console.log(`📦 TOTAL: ${totalCopied}/${totalRecords} registros copiados`);
    console.log('='.repeat(50));
}

main().catch(console.error);
