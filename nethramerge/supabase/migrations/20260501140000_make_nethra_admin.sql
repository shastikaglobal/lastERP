-- Migration: Make Nethra a Global Admin
-- This upgrades sreenethra681@gmail.com to the 'admin' role within the company
-- AND sets her profile status to 'approved' so she can pass the auth gate.

DO $$
DECLARE
    v_user_id       UUID;
    v_company_id    UUID;
    v_admin_role_id UUID;
BEGIN
    -- 1. Find Nethra's user ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'sreenethra681@gmail.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User sreenethra681@gmail.com not found in auth.users';
    END IF;

    -- 2. Get her current company
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = v_user_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'No company profile found for sreenethra681@gmail.com';
    END IF;

    -- 3. Find the Admin role for that company
    SELECT id INTO v_admin_role_id
    FROM public.roles
    WHERE company_id = v_company_id
      AND slug = 'admin'
    LIMIT 1;

    IF v_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Admin role not found for company %', v_company_id;
    END IF;

    -- 4. Remove any existing role assignments for Nethra
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id;

    -- 5. Assign the Admin role
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_user_id, v_admin_role_id);

    -- 6. CRITICAL: Set profile status to 'approved' so ProtectedRoute lets her through
    UPDATE public.profiles
    SET status = 'approved'
    WHERE id = v_user_id;

    RAISE NOTICE 'SUCCESS: sreenethra681@gmail.com is now Admin and status=approved';
END $$;
