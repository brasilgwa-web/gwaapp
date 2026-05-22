import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function inspectCaldeira3() {
  // Let's get the equipment named "Caldeira 3"
  const { data: eqs } = await supabase.from('equipments').select('id, name').ilike('name', '%Caldeira 3%');
  if (!eqs || eqs.length === 0) return console.log("No Caldeira 3 found");
  
  const cald3 = eqs[0];
  console.log("Found:", cald3);
  
  // Since we know test_results has equipment_id, wait, earlier my script said test_results for Caldeira 3 was empty.
  // Why? Maybe the results are linked by visit_id?
  // Let's find any test_result that has equipment_id = cald3.id
  const { data: results } = await supabase.from('test_results').select('test_definition_id, measured_value').eq('equipment_id', cald3.id).limit(20);
  
  if (results && results.length > 0) {
      console.log("Results for Caldeira 3:", results);
      const testIds = [...new Set(results.map(r => r.test_definition_id))];
      const { data: tests } = await supabase.from('test_definitions').select('id, name, unit, chart_color').in('id', testIds);
      console.log("Test Definitions used in Caldeira 3:", tests);
  } else {
      console.log("No results found for Caldeira 3 using eq eq");
      // Let's try finding the location_equipments
      const { data: locEqs } = await supabase.from('location_equipments').select('id').eq('equipment_id', cald3.id);
      if (locEqs && locEqs.length > 0) {
          const locEqIds = locEqs.map(l => l.id);
          const { data: results2 } = await supabase.from('test_results').select('test_definition_id, measured_value').in('equipment_id', locEqIds).limit(20);
          console.log("Results using locEqIds:", results2);
          
          if (results2 && results2.length > 0) {
              const testIds = [...new Set(results2.map(r => r.test_definition_id))];
              const { data: tests } = await supabase.from('test_definitions').select('id, name, unit, chart_color').in('id', testIds);
              console.log("Test Definitions used in Caldeira 3 (locEq):", tests);
          }
      }
  }
}
inspectCaldeira3();
