-- ============================================================
-- Permanent fix: Add sreenethra681@gmail.com as preset Admin
-- so GitHub / Google login auto-approves her every time.
-- ============================================================

-- STEP 1: Update handle_new_user trigger to include Nethra as preset admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company_id UUID;
  _role_slug  TEXT;
  _role_id    UUID;
  _is_preset  BOOLEAN := false;
  _status     public.user_approval_status := 'pending';
  _requested_role TEXT;
  _full_name  TEXT;
  _shared_company CONSTANT UUID := '00000000-0000-0000-0000-00000000ae01';
BEGIN
  _full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NEW.email
  );
  _requested_role := NULLIF(TRIM(NEW.raw_user_meta_data->>'requested_role'), '');

  -- ── Preset leadership accounts ──────────────────────────────
  IF lower(NEW.email) = 'kim.swathi.07@gmail.com' THEN
    _is_preset  := true;
    _company_id := _shared_company;
    _role_slug  := 'admin';
    _status     := 'approved';

  ELSIF lower(NEW.email) = 'swathitae35@gmail.com' THEN
    _is_preset  := true;
    _company_id := _shared_company;
    _role_slug  := 'manager';
    _status     := 'approved';

  -- ── Nethra: preset admin via GitHub or Google ────────────────
  ELSIF lower(NEW.email) = 'sreenethra681@gmail.com' THEN
    _is_preset  := true;
    _company_id := _shared_company;
    _role_slug  := 'admin';
    _status     := 'approved';

  ELSE
    -- Regular signup → pending until approved
    _company_id := _shared_company;
    _status     := 'pending';
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, company_id, email, full_name, status, requested_role, approved_at, approved_by)
  VALUES (
    NEW.id, _company_id, NEW.email, _full_name, _status, _requested_role,
    CASE WHEN _status = 'approved' THEN now() ELSE NULL END,
    CASE WHEN _status = 'approved' THEN NEW.id  ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    company_id  = EXCLUDED.company_id,
    email       = EXCLUDED.email,
    full_name   = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    -- Re-approve preset accounts even on subsequent logins
    status      = CASE WHEN _is_preset THEN 'approved'::public.user_approval_status
                       ELSE public.profiles.status END,
    approved_at = CASE WHEN _is_preset THEN COALESCE(public.profiles.approved_at, now())
                       ELSE public.profiles.approved_at END,
    updated_at  = now();

  -- Assign role for preset accounts
  IF _is_preset THEN
    SELECT id INTO _role_id FROM public.roles
      WHERE company_id = _company_id AND slug = _role_slug LIMIT 1;

    IF _role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.id, _role_id)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.approval_audit_log
        (company_id, target_user_id, actor_user_id, action, previous_status, new_status, role_slug, reason)
      VALUES
        (_company_id, NEW.id, NEW.id, 'approved', 'pending', 'approved', _role_slug, 'Auto-approved preset account');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- STEP 2: Immediately fix Nethra's existing profile right now
UPDATE public.profiles
SET
  status      = 'approved',
  company_id  = '00000000-0000-0000-0000-00000000ae01',
  approved_at = now(),
  approved_by = (SELECT id FROM auth.users WHERE lower(email) = 'kim.swathi.07@gmail.com' LIMIT 1),
  updated_at  = now()
WHERE lower(email) = 'sreenethra681@gmail.com';

-- STEP 3: Remove old role and assign Admin
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = 'sreenethra681@gmail.com');

INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
JOIN public.roles r
  ON r.company_id = '00000000-0000-0000-0000-00000000ae01'
 AND r.slug = 'admin'
WHERE lower(u.email) = 'sreenethra681@gmail.com'
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Done: sreenethra681@gmail.com is now a permanent preset Admin.';
