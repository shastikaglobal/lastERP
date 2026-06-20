-- Add not_attended_names column to bde_daily_reports
ALTER TABLE public.bde_daily_reports ADD COLUMN IF NOT EXISTS not_attended_names text;
