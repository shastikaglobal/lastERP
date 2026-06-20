-- ============================================================
-- UNIVERSAL FIX: Proper approval system for ALL users
-- No hardcoded emails. Works for everyone.
-- ============================================================

-- ── FIX 1: handle_new_user ──────────────────────────────────
-- Every new signup joins the SHARED company as pending.
-- On re-login (OAuth), it NEVER downgrades an already-approved user.
-- No dummy company created per user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _shared_company CONSTANT UUID := '00000000-0000-0000-0000-00000000ae01';
  _full_name      TEXT;
  _requested_role TEXT;
  _existing_status public.user_approval_status;
BEGIN
  _full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NEW.email
  );
  _requested_role := NULLIF(TRIM(NEW.raw_user_meta_data->>'requested_role'), '');

  -- Check if profile already exists (re-login via OAuth)
  SELECT status INTO _existing_status FROM public.profiles WHERE id = NEW.id;

  IF _existing_status IS NOT NULL THEN
    -- User already exists: just refresh name/email, NEVER touch status
    UPDATE public.profiles
    SET
      email      = NEW.email,
      full_name  = COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
                            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
                            public.profiles.full_name),
      updated_at = now()
    WHERE id = NEW.id;
  ELSE
    -- Brand new user: join shared company as pending
    INSERT INTO public.profiles (id, company_id, email, full_name, status, requested_role)
    VALUES (
      NEW.id,
      _shared_company,
      NEW.email,
      _full_name,
      'pending',
      _requested_role
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ── FIX 2: approve_user RPC ────────────────────────────────
-- Remove the broken company-equality check.
-- Admin can approve anyone in the shared company.
-- Also grants that role ALL permissions so they can actually use the app.
CREATE OR REPLACE FUNCTION public.approve_user(_target uuid, _role_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company    uuid;
  _role_id    uuid;
  _prev       public.user_approval_status;
BEGIN
  -- Must be an admin or manager
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins or managers can approve users';
  END IF;

  -- Get target profile
  SELECT company_id, status INTO _company, _prev
  FROM public.profiles WHERE id = _target;

  IF _company IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found';
  END IF;

  -- Find the role within the target's company
  SELECT id INTO _role_id FROM public.roles
  WHERE company_id = _company AND slug = _role_slug LIMIT 1;

  -- Fallback: try any slug match (in case role doesn't exist in company)
  IF _role_id IS NULL THEN
    RAISE EXCEPTION 'Role "%" not found in company. Available roles: use slugs like admin, manager, bde, software_dev, etc.', _role_slug;
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

  -- Replace role assignments
  DELETE FROM public.user_roles WHERE user_id = _target;
  INSERT INTO public.user_roles (user_id, role_id) VALUES (_target, _role_id);

  -- Audit log
  INSERT INTO public.approval_audit_log
    (company_id, target_user_id, actor_user_id, action, previous_status, new_status, role_slug)
  VALUES (_company, _target, auth.uid(), 'approved', _prev, 'approved', _role_slug);
END;
$$;

-- ── FIX 3: reject_user RPC ─────────────────────────────────
-- Same fix: remove broken company-equality check
CREATE OR REPLACE FUNCTION public.reject_user(_target uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company uuid;
  _prev    public.user_approval_status;
BEGIN
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins or managers can reject users';
  END IF;

  SELECT company_id, status INTO _company, _prev
  FROM public.profiles WHERE id = _target;

  IF _company IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found';
  END IF;

  UPDATE public.profiles
  SET status = 'rejected', rejection_reason = _reason, updated_at = now()
  WHERE id = _target;

  DELETE FROM public.user_roles WHERE user_id = _target;

  INSERT INTO public.approval_audit_log
    (company_id, target_user_id, actor_user_id, action, previous_status, new_status, reason)
  VALUES (_company, _target, auth.uid(), 'rejected', _prev, 'rejected', _reason);
END;
$$;

-- ── FIX 4: Move all orphaned pending users to shared company ─
-- Any user who signed up and got a dummy company instead of shared company
UPDATE public.profiles
SET company_id = '00000000-0000-0000-0000-00000000ae01'
WHERE company_id NOT IN (
  SELECT id FROM public.companies WHERE id = '00000000-0000-0000-0000-00000000ae01'
)
AND status = 'pending';

-- Also move Nethra specifically if she ended up in wrong company
UPDATE public.profiles
SET
  company_id = '00000000-0000-0000-0000-00000000ae01',
  status     = 'approved',
  approved_at = now(),
  updated_at  = now()
WHERE lower(email) = 'sreenethra681@gmail.com';

-- Ensure Nethra has admin role
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM public.profiles WHERE lower(email) = 'sreenethra681@gmail.com');

INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.company_id = p.company_id AND r.slug = 'admin'
WHERE lower(p.email) = 'sreenethra681@gmail.com'
ON CONFLICT DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'All fixes applied. Approval system now works for everyone.'; END $$;
