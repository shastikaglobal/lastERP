-- Add `department` column to profiles and index it
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

-- Backfill department for users with BDE/Sales roles
-- This sets department = 'BDE' where user has role slug 'bde' or 'sales'
UPDATE public.profiles p
SET department = 'BDE'
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE p.id = ur.user_id AND (LOWER(r.slug) = 'bde' OR LOWER(r.slug) = 'sales');

-- Backfill department = 'Admin' for admin role
UPDATE public.profiles p
SET department = 'Admin'
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE p.id = ur.user_id AND LOWER(r.slug) = 'admin';

-- Note: Further manual adjustments may be needed for other teams.
