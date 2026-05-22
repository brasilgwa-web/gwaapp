import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function checkTestName() {
    const { data: tests, error } = await supabase.from('test_definitions').select('id, name, chart_color').in('id', [
        '359b45cf-1ed1-4d77-b8d9-29be12d1d499',
        '7f4d83d3-8dd4-4a6c-a5bf-045568b9314c'
    ]);
    if (error) console.error(error);
    console.log(tests);
}
checkTestName();
