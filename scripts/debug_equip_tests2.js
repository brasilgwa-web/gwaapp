import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function checkResults() {
  const { data: res } = await supabase.from('test_results').select('equipment_id, test_definition_id').limit(100);
  const eqIds = [...new Set(res.map(r => r.equipment_id))];
  const { data: eqs } = await supabase.from('equipments').select('id, name').in('id', eqIds);
  console.log("Eqs with results:", eqs);

  const calds = eqs.filter(e => e.name.toLowerCase().includes('caldeira'));
  console.log("Caldeiras:", calds);

  for (const cald of calds) {
    const uniqueTests = [...new Set(res.filter(r => r.equipment_id === cald.id).map(r => r.test_definition_id))];
    const { data: tests } = await supabase.from('test_definitions').select('id, name').in('id', uniqueTests);
    console.log(`Tests in ${cald.name}:`, tests);
  }
}
checkResults();
