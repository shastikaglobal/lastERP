-- Sync products from website shastikaglobal.co.in
DO $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    
    INSERT INTO public.products (company_id, sku, name, category, unit, hs_code, is_active)
    VALUES 
        (v_company_id, 'AGRI-CCN-TND', 'Tender Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-GRN', 'Green Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-HSK', 'Husked Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-SHK', 'Semi-Husked Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-DHK', 'Dehusked Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        (v_company_id, 'AGRI-CCN-ORG', 'Fresh Organic Coconut', 'Coconuts', 'pieces', '080119', TRUE),
        
        (v_company_id, 'AGRI-TOM-001', 'Tomato', 'Vegetables', 'tons', '070200', TRUE),
        
        (v_company_id, 'AGRI-WML-REG', 'Watermelon', 'Fruits', 'tons', '080711', TRUE),
        (v_company_id, 'AGRI-WML-BLK', 'Black Diamond Watermelon', 'Fruits', 'tons', '080711', TRUE),
        
        (v_company_id, 'AGRI-PMK-YEL', 'Yellow Pumpkin', 'Vegetables', 'tons', '070993', TRUE),
        (v_company_id, 'AGRI-PMK-WHT', 'White Pumpkin', 'Vegetables', 'tons', '070993', TRUE),
        
        (v_company_id, 'AGRI-CUC-YEL', 'Yellow Cucumber', 'Vegetables', 'tons', '070700', TRUE),
        
        (v_company_id, 'AGRI-BAN-CAV', 'Cavendish Banana', 'Bananas', 'tons', '080390', TRUE),
        (v_company_id, 'AGRI-BAN-BBY', 'Baby Banana', 'Bananas', 'tons', '080390', TRUE),
        (v_company_id, 'AGRI-BAN-NEN', 'Nendran Banana', 'Bananas', 'tons', '080390', TRUE),
        (v_company_id, 'AGRI-BAN-RED', 'Red Banana', 'Bananas', 'tons', '080390', TRUE)
    ON CONFLICT (company_id, sku) DO UPDATE 
    SET name = EXCLUDED.name, 
        category = EXCLUDED.category, 
        unit = EXCLUDED.unit;

    -- Update old Cucumber SKU if it exists
    UPDATE public.products SET name = 'Yellow Cucumber', sku = 'AGRI-CUC-YEL' WHERE company_id = v_company_id AND sku = 'AGRI-CUC-001';

END $$;
