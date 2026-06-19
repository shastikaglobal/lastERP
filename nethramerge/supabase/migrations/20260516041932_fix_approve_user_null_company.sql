-- Fix approve_user function to handle NULL company_id gracefully
-- and automatically assign them to the default company if needed.

CREATE OR REPLACE FUNCTION public.approve_user(_target uuid, _role_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company  uuid;
  _role_id  uuid;
  _prev     public.user_approval_status;
  _shared_company CONSTANT UUID := '00000000-0000-0000-0000-00000000ae01';
BEGIN
  -- Permission check
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins or managers can approve users';
  END IF;

  -- Get target profile
  SELECT company_id, status INTO _company, _prev
  FROM public.profiles WHERE id = _target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found in database';
  END IF;

  -- Fix NULL company_id gracefully
  IF _company IS NULL THEN
    _company := _shared_company;
    UPDATE public.profiles SET company_id = _company WHERE id = _target;
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
    company_id       = _company,
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
