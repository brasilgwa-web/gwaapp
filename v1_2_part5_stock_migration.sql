-- Migration V1.2 Part 5: Stock Management Flags

-- Add flag to track if stock has been deducted for a visit
ALTER TABLE visits ADD COLUMN IF NOT EXISTS stock_deducted_at TIMESTAMP WITH TIME ZONE;
