-- Add logo2_url column to report_settings table
-- This column stores the URL of the second logo (displayed on left side of header)

ALTER TABLE public.report_settings
ADD COLUMN IF NOT EXISTS logo2_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.report_settings.logo2_url IS 'URL of the second logo. Displayed next to the title on the left side of the report header.';
