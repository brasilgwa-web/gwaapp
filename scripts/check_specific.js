import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function checkSpecificTest() {
    // 359b45cf... is the one I suspect is the "good" one
    // 7f4d83d3... is the one Caldeira 3 is using
    const { data: tests, error } = await supabase.from('test_definitions').select('id, name, unit, chart_color').in('id', [
        '359b45cf-1ed1-4d77-b8d9-29be12d1d499',
        '7f4d83d3-8dd4-4a6c-a5bf-045568b9314c'
    ]);
    if (error) {
        // If chart_color fails, let's try without it
        const { data: tests2 } = await supabase.from('test_definitions').select('id, name, unit').in('id', [
            '359b45cf-1ed1-4d77-b8d9-29be12d1d499',
            '7f4d83d3-8dd4-4a6c-a5bf-045568b9314c'
        ]);
        console.log("Tests without chart_color:", tests2);
    } else {
        console.log("Tests with chart_color:", tests);
    }
}
checkSpecificTest();
