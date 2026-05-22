import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaqjbdxntuchphtsbkyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg'
);

const CHART_COLORS = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#0ea5e9', // sky-500
    '#eab308', // yellow-500
    '#16a34a', // green-600
    '#8b5cf6', // violet-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#7c3aed', // violet-600
    '#ea580c', // orange-600
    '#0284c7', // sky-600
    '#ca8a04', // yellow-600
    '#059669', // emerald-600
    '#be185d', // pink-700
    '#4f46e5', // indigo-600
    '#0d9488', // teal-600
    '#9333ea', // purple-600
    '#65a30d', // lime-600
];

async function checkColors() {
  const { data: allTestDefs } = await supabase.from('test_definitions').select('id, name');
  
  const sortedTestDefs = [...(allTestDefs || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const testColorMap = {};
  sortedTestDefs.forEach((t, idx) => {
      testColorMap[t.id] = CHART_COLORS[idx % CHART_COLORS.length];
  });

  const phTest = allTestDefs.find(t => t.name === 'pH');
  console.log("pH Test color:", testColorMap[phTest.id]);
}
checkColors();
