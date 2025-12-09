-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Drop the incorrect foreign key constraint that points to the 'equipments' catalog
ALTER TABLE public.test_results 
DROP CONSTRAINT IF EXISTS test_results_equipment_id_fkey;

-- 2. Add the correct foreign key constraint pointing to the 'location_equipments' table
-- This allows us to store results for specific equipment instances (e.g., Pump A vs Pump B)
ALTER TABLE public.test_results 
ADD CONSTRAINT test_results_equipment_id_fkey 
FOREIGN KEY (equipment_id) 
REFERENCES public.location_equipments(id) 
ON DELETE CASCADE;
