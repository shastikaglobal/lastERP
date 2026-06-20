-- ============================================================
-- NOTIFICATIONS: Real-time support + per-user targeting
-- ============================================================

-- 1. Add user_id column (nullable = company-wide broadcast; set = personal)
ALTER TABLE public.app_notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Re-enable RLS (was disabled for demo)
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
--    Users see: notifications addressed to them OR company-wide ones (user_id IS NULL)
DROP POLICY IF EXISTS "notif_select" ON public.app_notifications;
CREATE POLICY "notif_select" ON public.app_notifications
  FOR SELECT USING (
    (user_id IS NULL AND company_id = public.current_company_id())
    OR user_id = auth.uid()
  );


  




-- Admins/managers can insert notifications for the company
DROP POLICY IF EXISTS "notif_insert" ON public.app_notifications;
CREATE POLICY "notif_insert" ON public.app_notifications
  FOR INSERT WITH CHECK (
    company_id = public.current_company_id()
    AND (public.is_admin_or_manager(auth.uid()) OR user_id = auth.uid())
  );

-- Users can mark their own notifications as read
DROP POLICY IF EXISTS "notif_update_read" ON public.app_notifications;
CREATE POLICY "notif_update_read" ON public.app_notifications
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND company_id = public.current_company_id())
  );

-- Note: app_notifications is already in supabase_realtime publication (added previously)
-- No action needed for realtime setup.

DO $$ BEGIN
  RAISE NOTICE 'Notifications: RLS enabled, user_id column added. Realtime was already configured.';
END $$;
