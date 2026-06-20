-- Script to Register Real Employees into Live Supabase Database
-- Run this script in the Supabase Dashboard -> SQL Editor

DO $$
DECLARE
    v_company_id UUID;
    v_manager_role UUID;
    v_staff_role UUID;
    
    v_uid UUID;
    v_auto_company UUID;
    
    -- Arrays for iteration
    v_names TEXT[] := ARRAY['Preethi', 'Madhumithi', 'Uma Parameshwari', 'Karunya', 'Nethra', 'Swathi', 'Jaya Sri', 'Gayathri', 'Kaviya'];
    v_emails TEXT[] := ARRAY['preethi@shastika.com', 'madhumithi@shastika.com', 'uma@shastika.com', 'karunya@shastika.com', 'nethra@shastika.com', 'swathi@shastika.com', 'jayasri@shastika.com', 'gayathri@shastika.com', 'kaviya@shastika.com'];
    v_roles UUID[];
    i INT;
BEGIN
    -- 1. Get the primary company
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'No company found. Please ensure at least one user has signed up via the app.';
    END IF;

    -- 2. Get Roles
    SELECT id INTO v_manager_role FROM public.roles WHERE company_id = v_company_id AND slug = 'manager' LIMIT 1;
    SELECT id INTO v_staff_role FROM public.roles WHERE company_id = v_company_id AND slug = 'warehouse_staff' LIMIT 1;
    
    -- Fallbacks in case those specific roles were renamed or deleted
    IF v_manager_role IS NULL THEN
        SELECT id INTO v_manager_role FROM public.roles WHERE company_id = v_company_id LIMIT 1;
    END IF;
    IF v_staff_role IS NULL THEN
        v_staff_role := v_manager_role;
    END IF;
    IF v_staff_role IS NULL THEN
        RAISE EXCEPTION 'No roles found in the company. Please create at least one role.';
    END IF;
    
    -- Assign Preethi as Manager, rest as Staff/Standard role
    v_roles := ARRAY[v_manager_role, v_staff_role, v_staff_role, v_staff_role, v_staff_role, v_staff_role, v_staff_role, v_staff_role, v_staff_role, v_staff_role];

    -- 3. Loop through and create users
    FOR i IN 1..array_length(v_names, 1) LOOP
        -- Check if user already exists
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_emails[i]) THEN
            v_uid := gen_random_uuid();
            
            -- Insert into auth.users (this triggers handle_new_user and creates a dummy company)
            INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
            VALUES ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_emails[i], crypt('Welcome@Shastika2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', json_build_object('full_name', v_names[i]), now(), now());
            
            -- Fetch the auto-generated dummy company
            SELECT company_id INTO v_auto_company FROM public.profiles WHERE id = v_uid;
            
            -- Re-link the profile to the correct primary company
            UPDATE public.profiles SET company_id = v_company_id WHERE id = v_uid;
            
            -- Delete the auto-generated dummy company (only if it's not the primary company)
            IF v_auto_company IS NOT NULL AND v_auto_company != v_company_id THEN
                DELETE FROM public.companies WHERE id = v_auto_company;
            END IF;
            
            -- Assign the correct role in the primary company
            INSERT INTO public.user_roles (user_id, role_id) VALUES (v_uid, v_roles[i]);
            
            RAISE NOTICE 'Created user % with email %', v_names[i], v_emails[i];
        ELSE
            RAISE NOTICE 'User % already exists, skipping.', v_emails[i];
        END IF;
    END LOOP;

END $$;
