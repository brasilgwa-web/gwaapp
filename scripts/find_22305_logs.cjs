const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
function loadEnv() {
    try {
        const content = fs.readFileSync('.env.backup', 'utf16le');
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.trim() && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        }
    } catch (e) { }
}
loadEnv();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkOldTests() {
    console.log("Searching logs for NALCO 22305...");

    const { data: logs } = await supabase.from('system_logs')
        .select('*')
        .eq('category', 'crud')
        .ilike('message', '%teste%')
        .order('created_at', { ascending: false })
        .limit(500);

    for (const log of logs || []) {
        if (log.details && log.details.entity === 'test_definition') {
            const str = JSON.stringify(log.details);
            if (str.includes('22305')) {
                console.log(`Date: ${log.created_at}, action: ${log.details.action}`);
                console.log(JSON.stringify(log.details.fields || log.details.data, null, 2));
                console.log("-----");
            }
        }
    }
}

checkOldTests();
