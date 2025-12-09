import { createClient } from '@supabase/supabase-js'

// Fallback to hardcoded values if env vars are missing (Temporary fix for local dev issues)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://uaqjbdxntuchphtsbkyd.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg";

console.log("Supabase Config:", {
    url: supabaseUrl ? "Found" : "Missing",
    key: supabaseKey ? "Found (masked)" : "Missing"
});

if (!supabaseUrl || !supabaseKey) {
    console.error("Critical: Supabase config missing even after fallback.");
}

export const supabase = createClient(supabaseUrl, supabaseKey)
