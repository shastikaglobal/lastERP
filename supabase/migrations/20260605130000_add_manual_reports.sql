-- Add report_type and metrics columns to bde_daily_reports to support weekly and monthly manual submissions
ALTER TABLE public.bde_daily_reports ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'daily';
ALTER TABLE public.bde_daily_reports ADD COLUMN IF NOT EXISTS metrics jsonb DEFAULT '{}'::jsonb;
