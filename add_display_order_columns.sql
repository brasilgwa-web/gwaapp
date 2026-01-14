ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS display_order SERIAL;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS display_order SERIAL;
