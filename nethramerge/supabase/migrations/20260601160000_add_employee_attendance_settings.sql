-- Add monthly_salary and punch_deadline columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_salary numeric default 0,
ADD COLUMN IF NOT EXISTS punch_deadline time default '08:00:00';

-- Add is_manual and is_excused columns to attendance_logs
ALTER TABLE public.attendance_logs
ADD COLUMN IF NOT EXISTS is_manual boolean default false,
ADD COLUMN IF NOT EXISTS is_excused boolean default false;

-- Backfill initial salaries based on latest user request
UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%gayathri%';
UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%kaviya%';
UPDATE public.profiles SET monthly_salary = 30000 WHERE lower(full_name) LIKE '%lakshmana gokul%';
UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%madhumitha%';
UPDATE public.profiles SET monthly_salary = 17000 WHERE lower(full_name) LIKE '%uma%';
UPDATE public.profiles SET monthly_salary = 8000 WHERE lower(full_name) LIKE '%nethra%';
UPDATE public.profiles SET monthly_salary = 8000 WHERE lower(full_name) LIKE '%swathi%';
UPDATE public.profiles SET monthly_salary = 30000 WHERE lower(full_name) LIKE '%preethi%';
UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%karunya%';
UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%jayasri%';
UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%sathpreethika%';

-- Preethi M's custom punch deadline (10:00 AM)
UPDATE public.profiles SET punch_deadline = '10:00:00' WHERE lower(full_name) LIKE 'preethi m%';
