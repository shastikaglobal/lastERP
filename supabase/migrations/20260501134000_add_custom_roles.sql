DO $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Get the primary company
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;

    -- Insert the new custom roles
    INSERT INTO public.roles (company_id, name, slug, description, is_system)
    VALUES 
        (v_company_id, 'BDE', 'bde', 'Business Development Executive', false),
        (v_company_id, 'Software Dev', 'software_dev', 'Software Developer', false),
        (v_company_id, 'Net & Security', 'net_security', 'Networks and Security', false),
        (v_company_id, 'Secretary', 'secretary', 'Secretary / Admin Assistant', false)
    ON CONFLICT (company_id, slug) DO NOTHING;
END $$;
