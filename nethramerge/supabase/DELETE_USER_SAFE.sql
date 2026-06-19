-- ================================================================
-- RUN THIS IN SUPABASE DASHBOARD → SQL Editor
-- Safely removes all references to a user so they can be deleted
-- from the Auth dashboard without the FK constraint error.
--
-- USER: shastikaglobalimpexpvtltd@gmail.com
-- ================================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Find the user's UUID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'shastikaglobalimpexpvtltd@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found – already deleted or wrong email.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- 2. Nullify created_by in shipment_events (nullable FK)
  UPDATE public.shipment_events   SET created_by = NULL WHERE created_by = v_user_id;

  -- 3. Nullify created_by in notifications
  UPDATE public.notifications     SET created_by = NULL WHERE created_by = v_user_id;

  -- 4. Nullify created_by in qc_inspections (if column exists)
  UPDATE public.qc_inspections    SET created_by = NULL WHERE created_by = v_user_id;

  -- 5. Nullify assigned_to / created_by in leads / crm_activities
  UPDATE public.leads             SET assigned_to = NULL WHERE assigned_to = v_user_id;
  UPDATE public.crm_activities    SET created_by  = NULL WHERE created_by  = v_user_id;

  -- 6. Nullify created_by in purchase_orders
  UPDATE public.purchase_orders   SET created_by = NULL WHERE created_by = v_user_id;

  -- 7. Nullify created_by in export_orders / export_shipments
  UPDATE public.export_orders     SET created_by = NULL WHERE created_by = v_user_id;
  UPDATE public.export_shipments  SET created_by = NULL WHERE created_by = v_user_id;

  -- 8. Nullify created_by in quotations
  UPDATE public.quotations        SET created_by = NULL WHERE created_by = v_user_id;

  -- 9. Soft-delete attendance rows instead of hard deleting them
  ALTER TABLE IF EXISTS public.attendance ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
  ALTER TABLE IF EXISTS public.attendance ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
  ALTER TABLE IF EXISTS public.attendance ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;
  UPDATE public.attendance
  SET is_deleted = true,
      deleted_at = NOW(),
      deleted_by = NULL
  WHERE profile_id = v_user_id;

  -- 10. Soft-delete the profile row instead of removing it from the database
  ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
  ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
  ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;
  UPDATE public.profiles
  SET is_deleted = true,
      deleted_at = NOW(),
      deleted_by = NULL
  WHERE id = v_user_id;

  RAISE NOTICE 'All references cleared for user %. You can now delete them from the Auth dashboard.', v_user_id;
END;
$$;
