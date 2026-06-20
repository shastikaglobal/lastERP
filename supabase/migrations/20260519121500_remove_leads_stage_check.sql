-- Drop the hardcoded check constraint on lead stages to prevent database check constraint violations
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_stage_check;
