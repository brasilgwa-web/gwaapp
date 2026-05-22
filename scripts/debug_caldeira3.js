import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function debugCaldeira3() {
  const { data: eqs } = await supabase.from('equipments').select('*').ilike('name', '%Caldeira 3%');
  console.log("Found equipments:", eqs);

  if (eqs && eqs.length > 0) {
    const eqId = eqs[0].id;
    // get loc_equip
    const { data: locEqs } = await supabase.from('location_equipments').select('*').eq('equipment_id', eqId);
    console.log("Loc eqs:", locEqs);

    if (locEqs && locEqs.length > 0) {
      // get test results for this loc_equip's equipment?
      // Wait, test_results uses equipment_id or loc_equip_id?
      // Actually test_results uses equipment_id. But my previous query found NO results!
      // Why? Maybe the equipment in the database is "Caldeira  3" (double space)?
      
      const { data: res } = await supabase.from('test_results').select('test_definition_id, measured_value, visit_id').eq('equipment_id', eqId).limit(50);
      console.log("Results for Caldeira 3:", res);

      const testIds = [...new Set(res.map(r => r.test_definition_id))];
      const { data: tests } = await supabase.from('test_definitions').select('id, name, unit, chart_color').in('id', testIds);
      console.log("Test Defs for Caldeira 3:", tests);
    }
  } else {
      // Let's just list all equipments
      const { data: allEqs } = await supabase.from('equipments').select('name').limit(100);
      console.log(allEqs.map(e => e.name).join(', '));
  }
}
debugCaldeira3();
