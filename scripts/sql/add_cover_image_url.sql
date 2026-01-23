-- Add cover_image_url column to report_settings table
-- This column stores the URL of a custom cover image that takes priority over the editor content

ALTER TABLE public.report_settings
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.report_settings.cover_image_url IS 'URL of custom cover image. When set, this image is used as the report cover instead of the editor content.';
