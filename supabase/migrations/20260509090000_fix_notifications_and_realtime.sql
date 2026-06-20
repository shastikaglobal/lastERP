
-- 1. Fix the activity notification trigger (was missing company_id)
CREATE OR REPLACE FUNCTION public.handle_new_activity_notification()
RETURNS TRIGGER AS $$
DECLARE
  _company_id UUID;
  _company_name TEXT;
BEGIN
  -- Get the company_id and name from the leads table
  IF NEW.lead_id IS NOT NULL THEN
    SELECT company_id, company_name INTO _company_id, _company_name 
    FROM public.leads 
    WHERE id = NEW.lead_id;
  END IF;

  -- Fallback to current user's company if lead lookup failed
  IF _company_id IS NULL THEN
    _company_id := public.current_company_id();
    _company_name := 'General';
  END IF;

  -- Insert into notifications table (Safe call using the helper)
  IF _company_id IS NOT NULL THEN
    INSERT INTO public.app_notifications (
      company_id,
      user_id,
      title,
      body,
      type,
      created_at
    ) VALUES (
      _company_id,
      NEW.created_by,
      'New Activity Created',
      'Activity "' || NEW.title || '" added for ' || COALESCE(_company_name, 'Unknown Lead'),
      'info',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure app_notifications is in the realtime publication
-- This is often the cause of "not working" realtime updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
  END IF;
END $$;
