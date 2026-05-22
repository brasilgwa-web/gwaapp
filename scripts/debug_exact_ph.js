import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function checkExact() {
  const { data: all } = await supabase.from('test_definitions').select('id, name');
  const phTests = all.filter(t => t.name.trim().toLowerCase() === 'ph');
  console.log("All exact/trimmed 'pH' tests:", phTests);
}
checkExact();
