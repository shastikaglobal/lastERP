CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  follow_up_date DATE NOT NULL,
  note TEXT,
  assigned_to TEXT,
  is_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (in case table was created previously without them)
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS is_notified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Create policies (open access for now since company_id was removed)
CREATE POLICY follow_ups_select_policy ON public.follow_ups
  FOR SELECT USING (true);

CREATE POLICY follow_ups_insert_policy ON public.follow_ups
  FOR INSERT WITH CHECK (true);

CREATE POLICY follow_ups_update_policy ON public.follow_ups
  FOR UPDATE USING (true);

CREATE POLICY follow_ups_delete_policy ON public.follow_ups
  FOR DELETE USING (false);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS trg_follow_ups_updated ON public.follow_ups;
CREATE TRIGGER trg_follow_ups_updated BEFORE UPDATE ON public.follow_ups 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;

-- Trigger schema reload
NOTIFY pgrst, 'reload schema';
