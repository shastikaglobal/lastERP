-- Adds rating column to farmers and inserts mock supplier data to populate the Analytics charts.

ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 4.0;

DO $$
DECLARE
  v_company_id UUID;
  v_gujarat UUID = gen_random_uuid();
  v_shenzhen UUID = gen_random_uuid();
  v_kerala UUID = gen_random_uuid();
  v_pune UUID = gen_random_uuid();
  v_punjab UUID = gen_random_uuid();
BEGIN
  -- Get the first company ID
  SELECT id INTO v_company_id FROM public.companies LIMIT 1;
  
  IF v_company_id IS NULL THEN
     RAISE EXCEPTION 'No company found';
  END IF;

  -- Insert Farmers
  INSERT INTO public.farmers (id, company_id, full_name, state, country, rating) VALUES 
  (v_gujarat, v_company_id, 'Gujarat Cotton Mills', 'Gujarat', 'India', 4.8),
  (v_shenzhen, v_company_id, 'Shenzhen Electronics', 'Guangdong', 'China', 4.6),
  (v_kerala, v_company_id, 'Kerala Spices Co.', 'Kerala', 'India', 4.9),
  (v_pune, v_company_id, 'Pune Auto Parts', 'Maharashtra', 'India', 4.2),
  (v_punjab, v_company_id, 'Punjab Wheat Farms', 'Punjab', 'India', 4.5);

  -- Insert Purchase Orders to reflect the spend data (USD '000)
  -- Gujarat ~250k
  INSERT INTO public.purchase_orders (company_id, po_number, farmer_id, total, currency, status) VALUES
  (v_company_id, 'PO-MOCK-01', v_gujarat, 250000, 'USD', 'received');
  
  -- Shenzhen ~400k
  INSERT INTO public.purchase_orders (company_id, po_number, farmer_id, total, currency, status) VALUES
  (v_company_id, 'PO-MOCK-02', v_shenzhen, 400000, 'USD', 'received');

  -- Kerala ~120k
  INSERT INTO public.purchase_orders (company_id, po_number, farmer_id, total, currency, status) VALUES
  (v_company_id, 'PO-MOCK-03', v_kerala, 120000, 'USD', 'received');

  -- Pune ~90k
  INSERT INTO public.purchase_orders (company_id, po_number, farmer_id, total, currency, status) VALUES
  (v_company_id, 'PO-MOCK-04', v_pune, 90000, 'USD', 'received');

  -- Punjab ~300k
  INSERT INTO public.purchase_orders (company_id, po_number, farmer_id, total, currency, status) VALUES
  (v_company_id, 'PO-MOCK-05', v_punjab, 300000, 'USD', 'received');

END $$;
