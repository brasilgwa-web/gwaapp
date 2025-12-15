-- v1_1_part5_migration.sql
-- Fix: Add missing min_stock column to products table

ALTER TABLE products
ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;

-- Optional: Add a comment
COMMENT ON COLUMN products.min_stock IS 'Minimum stock level for alerts/dashboard';
