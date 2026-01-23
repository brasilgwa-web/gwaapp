/**
 * Script de Importação de Clientes (Sem Google Auth)
 * 
 * Este script:
 * 1. Lê dados de clientes de um arquivo CSV (que já contém o drive_folder_id)
 * 2. Insere os clientes no Supabase
 * 
 * Uso: node scripts/import-clients.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ============ CONFIGURAÇÕES ============
const CLIENTS_CSV_PATH = path.join(__dirname, 'clients-to-import.csv');

// Supabase config
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uaqjbdxntuchphtsbkyd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ============ INICIALIZAÇÃO ============

function getSupabaseClient() {
    if (!SUPABASE_SERVICE_KEY) {
        throw new Error('SUPABASE_SERVICE_KEY não configurada. Defina como variável de ambiente.');
    }
    console.log('🔗 Conectando ao Supabase:', SUPABASE_URL);
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ============ FUNÇÕES PRINCIPAIS ============

/**
 * Parse do CSV para array de objetos
 */
function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    // Mapear cabeçalhos para keys do objeto
    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());

    // Header esperado: id, name, city, state, address, pasta
    console.log('📋 Headers encontrados:', headers);

    return lines.slice(1).map(line => {
        const values = line.split('\t');
        const obj = {};

        headers.forEach((header, index) => {
            const val = values[index]?.trim() || '';

            // Mapeamento de colunas
            if (header === 'id') obj.client_code = val;
            else if (header === 'name') obj.name = val;
            else if (header === 'city') obj.city = val;
            else if (header === 'state') obj.state = val;
            else if (header === 'address') obj.address = val;
            else if (header === 'pasta') obj.folder_id = val;
        });

        return obj;
    });
}

/**
 * Remove duplicatas baseado no client_code
 */
function removeDuplicates(clients) {
    const seen = new Set();
    return clients.filter(client => {
        if (!client.client_code) return false;

        const code = client.client_code;
        if (seen.has(code)) {
            return false;
        }
        seen.add(code);
        return true;
    });
}

/**
 * Processa um cliente: Insere no Supabase
 */
async function processClient(supabase, client, index, total) {
    const clientCode = client.client_code;
    const clientName = client.name;
    const city = client.city;
    const state = client.state;
    const address = client.address;
    const folderId = client.folder_id;

    console.log(`\n[${index + 1}/${total}] Processando: ${clientCode} - ${clientName}`);

    // Validar dados mínimos
    if (!clientCode || !clientName) {
        console.log(`  ❌ Dados incompletos. Pulando.`);
        return 'error';
    }

    // 1. Verificar se já existe no banco
    const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('client_code', clientCode)
        .single();

    if (existing) {
        console.log(`  ⏭️  Cliente já existe. Atualizando pasta...`);

        // Atualizar pasta se necessário
        const { error: updateError } = await supabase
            .from('clients')
            .update({ google_drive_folder_id: folderId })
            .eq('id', existing.id);

        if (updateError) {
            console.log(`  ❌ Erro ao atualizar: ${updateError.message}`);
            return 'error';
        }
        console.log(`  ✅ Pasta atualizada.`);
        return 'updated';
    }

    // 2. Inserir cliente no Supabase
    const { data, error } = await supabase
        .from('clients')
        .insert({
            client_code: clientCode,
            name: clientName,
            city_state: `${city} - ${state}`,
            address: address,
            google_drive_folder_id: folderId,
            is_sample: false
        })
        .select()
        .single();

    if (error) {
        console.log(`  ❌ Erro ao inserir: ${error.message}`);
        return 'error';
    }

    console.log(`  ✅ Cliente inserido com ID: ${data.id}`);
    return 'success';
}

/**
 * Função principal
 */
async function main() {
    console.log('='.repeat(60));
    console.log('IMPORTAÇÃO DE CLIENTES (DIRETO)');
    console.log('='.repeat(60));

    // Verificar arquivo CSV
    if (!fs.existsSync(CLIENTS_CSV_PATH)) {
        console.error(`\n❌ Arquivo CSV não encontrado: ${CLIENTS_CSV_PATH}`);
        process.exit(1);
    }

    // Inicializar supabase
    const supabase = getSupabaseClient();

    // Ler e parsear CSV
    console.log('\n📄 Lendo arquivo de clientes...');
    const csvContent = fs.readFileSync(CLIENTS_CSV_PATH, 'utf8');
    let clients = parseCSV(csvContent);

    console.log(`  Total de linhas lidas: ${clients.length}`);

    // Remover duplicatas e inválidos
    clients = removeDuplicates(clients);
    clients = clients.filter(c => c.name && !c.name.startsWith('*'));

    console.log(`  Total para importar: ${clients.length}`);

    if (clients.length === 0) {
        console.log('Nenhum cliente para importar.');
        return;
    }

    // Processar cada cliente
    const results = {
        success: 0,
        updated: 0,
        error: 0
    };

    for (let i = 0; i < clients.length; i++) {
        const status = await processClient(supabase, clients[i], i, clients.length);
        results[status] = (results[status] || 0) + 1;

        // Delay mínimo
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('RESUMO DA IMPORTAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Novos inseridos: ${results.success}`);
    console.log(`🔄 Atualizados: ${results.updated}`);
    console.log(`❌ Erros: ${results.error}`);
    console.log('='.repeat(60));
}

// Executar
main().catch(console.error);
