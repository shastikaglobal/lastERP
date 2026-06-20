-- Restore Realtime publication for everything
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;

-- Fix any auth.users that are missing from public.profiles
DO $$
DECLARE
  _user RECORD;
  _shared_company CONSTANT UUID := '00000000-0000-0000-0000-00000000ae01';
BEGIN
  FOR _user IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    INSERT INTO public.profiles (
      id, company_id, email, full_name, status, requested_role
    ) VALUES (
      _user.id,
      _shared_company,
      _user.email,
      COALESCE(
        NULLIF(TRIM(_user.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(_user.raw_user_meta_data->>'name'), ''),
        _user.email
      ),
      'pending',
      NULLIF(TRIM(_user.raw_user_meta_data->>'requested_role'), '')
    );
  END LOOP;
END
$$;
