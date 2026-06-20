-- Script to Register Real Products into Live Supabase Database
-- Run this script in the Supabase Dashboard -> SQL Editor

DO $$
DECLARE
    v_company_id UUID;
BEGIN
    -- 1. Get the primary company
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'No company found.';
    END IF;

    -- 2. Insert Products (ON CONFLICT DO NOTHING so it doesn't error if run twice)
    INSERT INTO public.products (company_id, sku, name, category, unit, hs_code, is_active)
    VALUES 
        (v_company_id, 'AGRI-CCN-HSK', 'Husked Brown Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-SHK', 'Semi-Husked Brown Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-DHK', 'Dehusked Brown Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-TND', 'Tender Green Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-GRN', 'Fresh Green Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        
        (v_company_id, 'AGRI-PMK-YEL', 'Yellow Pumpkin', 'Vegetables', 'tons', '070993', TRUE),
        (v_company_id, 'AGRI-PMK-WHT', 'White Pumpkin', 'Vegetables', 'tons', '070993', TRUE),
        
        (v_company_id, 'AGRI-WML-REG', 'Watermelon', 'Fruits', 'tons', '080711', TRUE),
        (v_company_id, 'AGRI-WML-BLK', 'Black Diamond Watermelon', 'Fruits', 'tons', '080711', TRUE),
        
        (v_company_id, 'AGRI-CUC-001', 'Cucumber', 'Vegetables', 'tons', '070700', TRUE),
        
        (v_company_id, 'AGRI-BAN-CAV', 'Cavendish Banana', 'Bananas', 'tons', '080390', TRUE),
        (v_company_id, 'AGRI-BAN-BBY', 'Baby Banana', 'Bananas', 'tons', '080390', TRUE),
        (v_company_id, 'AGRI-BAN-NEN', 'Nendran Banana', 'Bananas', 'tons', '080390', TRUE),
        (v_company_id, 'AGRI-BAN-RED', 'Red Banana', 'Bananas', 'tons', '080390', TRUE),
        
        (v_company_id, 'AGRI-TOM-001', 'Tomatoes', 'Vegetables', 'tons', '070200', TRUE)
    ON CONFLICT (company_id, sku) DO UPDATE 
    SET name = EXCLUDED.name, 
        category = EXCLUDED.category, 
        unit = EXCLUDED.unit;

    -- Clean up the old generic ones if they exist
    DELETE FROM public.products WHERE company_id = v_company_id AND sku IN ('AGRI-CCN-001', 'AGRI-WML-001', 'AGRI-PMK-001');

    RAISE NOTICE 'Successfully registered all agricultural products!';
END $$;
