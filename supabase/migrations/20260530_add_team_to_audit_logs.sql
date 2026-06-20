-- Add `team` column to audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS team VARCHAR(100);

-- Add index for fast team queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_team ON public.audit_logs(team);

-- Backfill existing audit log team values when possible.
UPDATE public.audit_logs
SET team = COALESCE(
  (SELECT department FROM public.profiles WHERE profiles.id = audit_logs.user_id),
  CASE
    WHEN lower(regexp_replace(profiles.full_name, '\\s+', '', 'g')) LIKE '%gayathri%' THEN 'BDE'
    WHEN lower(regexp_replace(profiles.full_name, '\\s+', '', 'g')) LIKE '%kaviya%' THEN 'BDE'
    WHEN lower(regexp_replace(profiles.full_name, '\\s+', '', 'g')) LIKE '%jayasri%' THEN 'Data Analyst'
    WHEN lower(regexp_replace(profiles.full_name, '\\s+', '', 'g')) LIKE '%madhumitha%' THEN 'Accounts'
    WHEN lower(regexp_replace(profiles.full_name, '\\s+', '', 'g')) LIKE '%karunya%' THEN 'IT'
    WHEN lower(regexp_replace(profiles.full_name, '\\s+', '', 'g')) LIKE '%swathi%' THEN 'IT'
    WHEN lower(regexp_replace(profiles.full_name, '\\s+', '', 'g')) LIKE '%nethra%' THEN 'IT'
    ELSE NULL
  END
)
FROM public.profiles
WHERE public.profiles.id = public.audit_logs.user_id
  AND public.audit_logs.team IS NULL;

-- No RLS changes required; inserts still validated by user_id trigger/policy
