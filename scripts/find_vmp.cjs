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
    } catch (e) {
        console.error('Error loading env', e);
    }
}
loadEnv();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function find5and2() {
    console.log("Searching test_definitions...");
    const { data: defs } = await supabase.from('test_definitions').select('*').or('name.ilike.%22305%,name.ilike.%NALCO 22305%');
    console.log("Defs found:", JSON.stringify(defs, null, 2));

    if (defs.length === 0) return;
    const defIds = defs.map(d => d.id);

    console.log("\nSearching equipment_tests...");
    const { data: eqTests } = await supabase.from('equipment_tests').select('*, equipments(name)').in('test_definition_id', defIds);
    console.log("Eq tests found:", JSON.stringify(eqTests, null, 2));

    console.log("\nSearching location_equipment_tests...");
    const { data: locEqTests } = await supabase.from('location_equipment_tests').select('*, location_equipments(id, equipments(name))').in('test_definition_id', defIds);
    console.log("Loc Eq tests found:", JSON.stringify(locEqTests, null, 2));
}

find5and2();
