-- Production Security Hardening
-- Re-enables RLS and enforces multi-tenancy (company-based) for all core ERP tables.

-- 1. Ensure RLS is enabled on all core tables
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.export_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.export_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.export_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_batches ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing loose or demo policies
DROP POLICY IF EXISTS "Users can view their company customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view their company sales" ON public.sales_orders;
DROP POLICY IF EXISTS "Users can view their company shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can view their company notifications" ON public.app_notifications;
DROP POLICY IF EXISTS "Allow all operations on export_shipments" ON public.export_shipments;
DROP POLICY IF EXISTS "Users can only access their company's shipments" ON public.export_shipments;
DROP POLICY IF EXISTS "Allow all operations on export_containers" ON public.export_containers;
DROP POLICY IF EXISTS "Users can only access their company's containers" ON public.export_containers;

-- 3. Create Robust Multi-Tenant Policies
-- Helper function to get current user's company_id (already exists in many systems, but we ensure one is reliable)
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Define Policies using the helper
-- Customers
CREATE POLICY "company_access_customers" ON public.customers
FOR ALL USING (company_id = public.get_my_company());

-- Sales Orders
CREATE POLICY "company_access_sales_orders" ON public.sales_orders
FOR ALL USING (company_id = public.get_my_company());

-- Shipments
CREATE POLICY "company_access_shipments" ON public.shipments
FOR ALL USING (company_id = public.get_my_company());

-- App Notifications
CREATE POLICY "company_access_notifications" ON public.app_notifications
FOR ALL USING (company_id = public.get_my_company());

-- Quotations
CREATE POLICY "company_access_quotations" ON public.quotations
FOR ALL USING (company_id = public.get_my_company());

-- Quotation Items
-- These usually link via quotation_id, but many have company_id too. 
-- We ensure they are secured.
CREATE POLICY "company_access_quotation_items" ON public.quotation_items
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.quotations q 
        WHERE q.id = public.quotation_items.quotation_id 
        AND q.company_id = public.get_my_company()
    )
);

-- Export System
CREATE POLICY "company_access_export_orders" ON public.export_orders
FOR ALL USING (company_id = public.get_my_company());

CREATE POLICY "company_access_export_shipments" ON public.export_shipments
FOR ALL USING (company_id = public.get_my_company());

CREATE POLICY "company_access_export_containers" ON public.export_containers
FOR ALL USING (company_id = public.get_my_company());

-- Products
CREATE POLICY "company_access_products" ON public.products
FOR ALL USING (company_id = public.get_my_company());

-- 4. Ensure Auto-population of company_id (Triggers)
-- This ensures even if frontend misses it, the database fills it correctly based on auth.uid()
CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name 
             FROM information_schema.columns 
             WHERE column_name = 'company_id' 
             AND table_schema = 'public' 
             AND table_name IN ('customers', 'sales_orders', 'shipments', 'app_notifications', 'quotations', 'export_orders', 'export_shipments', 'export_containers', 'products')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_set_company_id ON public.%I', t);
        EXECUTE format('CREATE TRIGGER tr_set_company_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_company_id()', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
