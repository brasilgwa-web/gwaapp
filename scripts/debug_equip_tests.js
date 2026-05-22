import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function checkEqs() {
  const { data: eqs, error } = await supabase.from('equipments').select('id, name').ilike('name', '%Caldeira%');
  if (error) return console.error(error);
  
  const cald1 = eqs.find(e => e.name.includes('1'));
  const cald3 = eqs.find(e => e.name.includes('3'));
  
  if (cald1) {
    const { data: res1 } = await supabase.from('test_results').select('test_definition_id').eq('equipment_id', cald1.id).limit(50);
    const uniqueTests1 = [...new Set(res1.map(r => r.test_definition_id))];
    const { data: tests1 } = await supabase.from('test_definitions').select('id, name').in('id', uniqueTests1);
    console.log("Caldeira 1 tests:", tests1);
  }

  if (cald3) {
    const { data: res3 } = await supabase.from('test_results').select('test_definition_id').eq('equipment_id', cald3.id).limit(50);
    const uniqueTests3 = [...new Set(res3.map(r => r.test_definition_id))];
    const { data: tests3 } = await supabase.from('test_definitions').select('id, name').in('id', uniqueTests3);
    console.log("Caldeira 3 tests:", tests3);
  }
}
checkEqs();
