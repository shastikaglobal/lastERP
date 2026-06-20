begin;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS incomplete_reason text;

commit;
