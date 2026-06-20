CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the caller is an admin
  IF NOT public.is_company_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
  END IF;

  -- Soft-delete the user's public profile instead of removing the auth user record.
  -- Keeping auth.users intact preserves audit history and avoids permanent deletion.
  UPDATE public.profiles
  SET is_deleted = true,
      deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', target_user_id;
  END IF;
END;
$$;
