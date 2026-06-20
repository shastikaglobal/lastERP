-- Trigger to create notifications for new CRM activities
CREATE OR REPLACE FUNCTION public.handle_new_activity_notification()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
BEGIN
  -- Get the company name from the leads table if lead_id is present
  IF NEW.lead_id IS NOT NULL THEN
    SELECT company_name INTO company_name FROM public.leads WHERE id = NEW.lead_id;
  ELSE
    company_name := 'General';
  END IF;

  -- Insert into notifications table
  INSERT INTO public.app_notifications (
    user_id,
    title,
    body,
    type,
    created_at
  ) VALUES (
    NEW.created_by,
    'New Activity Created',
    'Activity "' || NEW.title || '" added for ' || company_name,
    'info',
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_activity_notification ON public.activities;
CREATE TRIGGER trg_new_activity_notification
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_activity_notification();
