-- Migration: Create client_report_chart_settings table
-- Stores per-client configuration for trend charts in reports

CREATE TABLE IF NOT EXISTS public.client_report_chart_settings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  period_days INTEGER DEFAULT 365,
  selected_test_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.client_report_chart_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy (matching existing pattern)
CREATE POLICY "Allow all for authenticated" ON public.client_report_chart_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
