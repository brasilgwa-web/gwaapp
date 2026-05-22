import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function checkData() {
  const { data: results } = await supabase
    .from('test_results')
    .select('equipment_id, test_definition_id, measured_value, equipments(name), test_definitions(name)')
    .limit(100);

  console.log(results.filter(r => r.equipments && r.equipments.name && r.equipments.name.includes('Caldeira')));
}
checkData();
