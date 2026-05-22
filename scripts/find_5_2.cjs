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

async function find5and2Logs() {
    console.log("Searching logs for 5 and 2...");

    // Check if any equipment_tests had min=5, max=2
    const { data: eqLogs } = await supabase.from('system_logs')
        .select('*')
        .eq('category', 'crud')
        .ilike('message', '%atualizado%')
        .order('created_at', { ascending: false })
        .limit(100);

    let foundAny = false;
    for (const log of eqLogs || []) {
        if (log.details && log.details.entity === 'equipment') {
            const str = JSON.stringify(log.details);
            if (str.includes('"min_value":5') || str.includes('"min_value":"5"') || str.includes('"max_value":2')) {
                console.log(`Found Eq update! Date: ${log.created_at}, User: ${log.user_id}`);
                console.log(JSON.stringify(log.details, null, 2));
                foundAny = true;
            }
        }
    }

    if (!foundAny) {
        console.log("No equipment logs found with 5 and 2 explicitly in details.");
    }
}

find5and2Logs();
