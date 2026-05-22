import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

async function checkTests() {
  const { data, error } = await supabase.from('test_definitions').select('id, name').ilike('name', '%pH%');
  if (error) console.error(error);
  console.log("TESTS:", data);

  const { data: all } = await supabase.from('test_definitions').select('id, name');
  console.log("Total tests:", all.length);

  // let's check Caldeira 3 vs Caldeira 1 tests.
  // Caldeira 3 equipment_id is unknown, but we can query test_results where test_definition_id matches
}
checkTests();
