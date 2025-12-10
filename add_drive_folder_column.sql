
-- Adicionar coluna para ID da pasta do Google Drive
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_drive_folder_id text;
