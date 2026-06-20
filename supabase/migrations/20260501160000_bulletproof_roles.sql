-- ============================================================
-- BULLETPROOF ROLE SYSTEM
-- • No hardcoded emails.
-- • Approving a user via the UI always writes to user_roles.
-- • Re-login on any PC NEVER resets status or removes roles.
-- • If a user is approved but has no role, they get 'bde' as default.
-- ============================================================

-- ── 1. Final handle_new_user: safe for OAuth re-login on ANY device ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _shared_company CONSTANT UUID := '00000000-0000-0000-0000-00000000ae01';
  _full_name      TEXT;
  _existing_id    UUID;
BEGIN
  _full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NEW.email
  );

  -- Check if this user already has a profile
  SELECT id INTO _existing_id FROM public.profiles WHERE id = NEW.id;

  IF _existing_id IS NOT NULL THEN
    -- ✅ Existing user: ONLY update cosmetic fields, NEVER touch status/role
    UPDATE public.profiles
    SET
      email      = NEW.email,
      full_name  = COALESCE(
                     NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
                     NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
                     public.profiles.full_name
                   ),
      updated_at = now()
    WHERE id = NEW.id;
  ELSE
    -- 🆕 Brand new user: create profile as pending
    INSERT INTO public.profiles (id, company_id, email, full_name, status)
    VALUES (NEW.id, _shared_company, NEW.email, _full_name, 'pending');
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. Improved approve_user: ALWAYS assigns a role ──────────────────
-- This is what you call from the Approvals UI.
-- No hardcoding. Works for any user, any role.
CREATE OR REPLACE FUNCTION public.approve_user(_target uuid, _role_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company  uuid;
  _role_id  uuid;
  _prev     public.user_approval_status;
BEGIN
  -- Permission check
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins or managers can approve users';
  END IF;

  -- Get target profile
  SELECT company_id, status INTO _company, _prev
  FROM public.profiles WHERE id = _target;

  IF _company IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Resolve role
  SELECT id INTO _role_id FROM public.roles
  WHERE company_id = _company AND slug = _role_slug LIMIT 1;

  IF _role_id IS NULL THEN
    RAISE EXCEPTION 'Role "%" not found. Use: admin, manager, bde, software_dev, net_security, data_analyst, secretary', _role_slug;
  END IF;

  -- Approve the profile
  UPDATE public.profiles
  SET
    status           = 'approved',
    approved_at      = now(),
    approved_by      = auth.uid(),
    rejection_reason = null,
    updated_at       = now()
  WHERE id = _target;

  -- Assign role (replace any existing role)
  DELETE FROM public.user_roles WHERE user_id = _target;
  INSERT INTO public.user_roles (user_id, role_id) VALUES (_target, _role_id);

  -- Audit log
  INSERT INTO public.approval_audit_log
    (company_id, target_user_id, actor_user_id, action, previous_status, new_status, role_slug)
  VALUES (_company, _target, auth.uid(), 'approved', _prev, 'approved', _role_slug);
END;
$$;

-- ── 3. Heal the database: any approved user with no role ─────────────
-- Assign them the 'bde' role as a safe default (you can change it in the UI).
-- This fixes CURRENT users who were approved but are showing "Approved user".
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r
  ON r.company_id = p.company_id
 AND r.slug = 'bde'
WHERE p.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
  )
ON CONFLICT DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE 'Fix applied: all approved users without a role now have bde as default. Go to Approvals tab to promote any of them.';
END $$;
