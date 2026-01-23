-- Add technical_responsible_id to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS technical_responsible_id UUID REFERENCES technical_responsibles(id);

-- Optional: Add index for performance
CREATE INDEX IF NOT EXISTS idx_visits_technical_responsible_id ON visits(technical_responsible_id);
