const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uaqjbdxntuchphtsbkyd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function testDB() {
    console.log('Testando conexão com Supabase...');
    console.log('URL:', SUPABASE_URL);
    console.log('Key:', SUPABASE_SERVICE_KEY ? 'Configurada (' + SUPABASE_SERVICE_KEY.substring(0, 10) + '...)' : 'MISSING');

    if (!SUPABASE_SERVICE_KEY) {
        console.error('❌ KEY não configurada');
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        const { data, error } = await supabase.from('clients').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Erro ao conectar:', error.message);
        } else {
            console.log('✅ Conexão bem sucedida! Total de clientes:', data, '(count:', error, ')'); // data é null com head:true, count vem no response wrapper mas aqui so quero ver se nao da erro
            console.log('Query executada sem erro de permissão.');
        }
    } catch (e) {
        console.error('❌ Exceção:', e.message);
    }
}

testDB();
