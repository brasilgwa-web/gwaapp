import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper to load env vars manually to avoid dependencies
function loadEnv() {
    const files = ['.env', '.env.backup'];
    const encodings = ['utf8', 'utf16le'];

    for (const file of files) {
        const envPath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(envPath)) continue;

        for (const encoding of encodings) {
            try {
                console.log(`Trying to read ${file} with ${encoding}...`);
                const envContent = fs.readFileSync(envPath, encoding);

                console.log(`   Raw content length: ${envContent.length}`);
                console.log(`   First 100 chars: ${JSON.stringify(envContent.substring(0, 100))}`);

                const lines = envContent.split(/\r?\n/);
                console.log(`   Split into ${lines.length} lines.`);

                const env = {};
                lines.forEach(line => {
                    // console.log(`   Processing line: ${JSON.stringify(line.substring(0, 50))}...`);
                    const match = line.match(/^\s*([^=]+)=(.*)$/); // Allow leading whitespace just in case
                    if (match) {
                        const key = match[1].trim();
                        // simplistic value cleaning
                        const value = match[2].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '');
                        env[key] = value;
                    }
                });

                if (env.VITE_SUPABASE_URL) {
                    console.log(`✅ Successfully loaded env from ${file} (${encoding})`);
                    return env;
                }
            } catch (e) {
                console.warn(`Failed to read ${file} with ${encoding}:`, e.message);
            }
        }
    }
    return {};
}

const env = loadEnv();
console.log("Loaded keys:", Object.keys(env));
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDebug() {
    console.log("--- Starting Debug for 'Caldeira Lenha' ---");

    // 1. Find Equipment
    console.log("\n1. Searching for Equipment...");
    const { data: equipments, error: eqError } = await supabase
        .from('equipments')
        .select('id, name')
        .ilike('name', '%Caldeira Lenha%'); // Adjusted name based on user input

    if (eqError) {
        console.error("Error fetching equipment:", eqError);
        return;
    }

    if (!equipments || equipments.length === 0) {
        console.log("❌ No equipment found matching 'Caldeira Lenha'");
        // Try listing all to see if it's there under a diff name
        // const { data: all } = await supabase.from('equipments').select('name').limit(20);
        // console.log("First 20 equipments:", all.map(e => e.name));
        return;
    }

    console.log(`✅ Found ${equipments.length} equipment(s):`);
    equipments.forEach(e => console.log(`   - [${e.id}] ${e.name}`));

    const eqId = equipments[0].id;

    // 2. Fetch Linked Tests (Standard)
    console.log(`\n2. Fetching Standard Tests for Equipment ID: ${eqId}`);
    // Need to count them too
    const { count: testBodyCount, error: countError } = await supabase
        .from('equipment_tests')
        .select('*', { count: 'exact', head: true })
        .eq('equipment_id', eqId);

    console.log(`   Total linked tests (count): ${testBodyCount}`);

    const { data: linkedTests, error: linkError } = await supabase
        .from('equipment_tests')
        .select(`
            id,
            min_value,
            max_value,
            unit,
            test_definitions ( id, name )
        `)
        .eq('equipment_id', eqId)
        .limit(100); // Just peek

    if (linkError) {
        console.error("Error fetching linked tests:", linkError);
    } else {
        console.log(`   Fetched ${linkedTests.length} tests (showing first 10):`);
        linkedTests.slice(0, 10).forEach(lt => {
            console.log(`   - ${lt.test_definitions?.name}: ${lt.min_value} - ${lt.max_value} ${lt.unit}`);
        });
    }

    // Check specific tests "Trasar" and "pH"
    const trasar = linkedTests?.find(t => t.test_definitions?.name.toLowerCase().includes('trasar'));
    const ph = linkedTests?.find(t => t.test_definitions?.name.toLowerCase() === 'ph' || t.test_definitions?.name.toLowerCase().includes('ph ')); // strict or prefix match to avoid 'phenol' etc

    if (trasar) {
        console.log(`   ✅ Found 'Trasar' in standard links: ${JSON.stringify(trasar)}`);
    } else {
        console.log(`   ⚠️ 'Trasar' NOT found in standard links (first 100).`);
    }

    if (ph) {
        console.log(`   ✅ Found 'pH' in standard links: ${JSON.stringify(ph)}`);
    } else {
        console.log(`   ⚠️ 'pH' NOT found in standard links (first 100).`);
    }

    // 3. Fetch Location Overrides (if any)
    // We need a location_equipment ID for this.
    // Let's find where this equipment is installed.
    console.log(`\n3. Checking Installations (LocationEquipment)...`);

    const { data: installations, error: instError } = await supabase
        .from('location_equipments')
        .select(`
            id,
            location_id,
            locations ( name ),
            equipments ( name )
        `)
        .eq('equipment_id', eqId)
        .limit(5);

    if (instError) {
        console.error("Error fetching installations:", instError);
    } else {
        console.log(`   Found ${installations.length} installation(s).`);

        for (const inst of installations) {
            console.log(`   Checking installation at: ${inst.locations?.name} (ID: ${inst.id})`);

            // Check overrides
            const { data: overrides, error: overError } = await supabase
                .from('location_equipment_tests')
                .select(`
                    id,
                    min_value,
                    max_value,
                    test_definitions ( name )
                `)
                .eq('location_equipment_id', inst.id);

            if (overError) {
                console.error("   Error fetching overrides:", overError);
            } else if (overrides.length > 0) {
                console.log(`      ✅ Found ${overrides.length} overrides/custom tests:`);
                overrides.forEach(o => {
                    console.log(`      - ${o.test_definitions?.name}: ${o.min_value} - ${o.max_value}`);
                });
            } else {
                console.log("      No overrides found.");
            }
        }
    }
}

runDebug();
