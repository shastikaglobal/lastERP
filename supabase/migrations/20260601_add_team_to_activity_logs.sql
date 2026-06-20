-- Add team column to activity_logs for actor-based team inference
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS team TEXT;

CREATE INDEX IF NOT EXISTS idx_activity_logs_team ON public.activity_logs(team);

-- Backfill existing activity logs where team can be inferred from actor name or profile.
UPDATE public.activity_logs
SET team = COALESCE(
  (SELECT department FROM public.profiles WHERE id = actor_id),
  CASE
    WHEN lower(regexp_replace(actor_name, '\\s+', '', 'g')) LIKE '%gayathri%' THEN 'BDE'
    WHEN lower(regexp_replace(actor_name, '\\s+', '', 'g')) LIKE '%kaviya%' THEN 'BDE'
    WHEN lower(regexp_replace(actor_name, '\\s+', '', 'g')) LIKE '%jayasri%' THEN 'Data Analyst'
    WHEN lower(regexp_replace(actor_name, '\\s+', '', 'g')) LIKE '%madhumitha%' THEN 'Accounts'
    WHEN lower(regexp_replace(actor_name, '\\s+', '', 'g')) LIKE '%karunya%' THEN 'IT'
    WHEN lower(regexp_replace(actor_name, '\\s+', '', 'g')) LIKE '%swathi%' THEN 'IT'
    WHEN lower(regexp_replace(actor_name, '\\s+', '', 'g')) LIKE '%nethra%' THEN 'IT'
    ELSE NULL
  END
)
WHERE team IS NULL;
