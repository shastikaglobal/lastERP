-- Change not_attended_names to not_attended_calls integer
ALTER TABLE public.bde_daily_reports DROP COLUMN IF EXISTS not_attended_names;
ALTER TABLE public.bde_daily_reports ADD COLUMN IF NOT EXISTS not_attended_calls integer DEFAULT 0;
