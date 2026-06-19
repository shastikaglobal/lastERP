-- ============================================================
-- FIX: Remove rogue trigger that auto-assigns Admin to ALL new users
-- This was the bug: AUTO_ASSIGN_ADMIN.sql created a trigger
-- `on_auth_user_created_assign_role` which gave EVERYONE admin
-- role upon signup, bypassing the approval system entirely.
-- ============================================================

-- STEP 1: Drop the rogue trigger that grants admin to every new signup
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- STEP 2: Drop the rogue function that it called
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- STEP 3: Remove the admin role from any user who:
--   (a) has status = 'pending' (not yet approved), AND
--   (b) has the admin role (which they got incorrectly from the rogue trigger)
DELETE FROM public.user_roles
WHERE role_id = (SELECT id FROM public.roles WHERE slug = 'admin' LIMIT 1)
  AND user_id IN (
    SELECT id FROM public.profiles WHERE status = 'pending'
  );

-- STEP 4: Also remove admin from rejected users
DELETE FROM public.user_roles
WHERE role_id = (SELECT id FROM public.roles WHERE slug = 'admin' LIMIT 1)
  AND user_id IN (
    SELECT id FROM public.profiles WHERE status = 'rejected'
  );

-- STEP 5: Verify — confirm the rogue trigger no longer exists
DO $$ BEGIN
  RAISE NOTICE 'Fix applied. Rogue auto-admin trigger removed.';
  RAISE NOTICE 'Only approved users retain their roles now.';
  RAISE NOTICE 'New signups will correctly start as PENDING and need admin approval.';
END $$;
