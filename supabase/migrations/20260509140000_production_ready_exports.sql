-- Make Export system production ready with multi-tenancy and better status tracking
-- This migration ensures all export tables have company_id and are correctly linked

-- 1. Update export_orders
ALTER TABLE public.export_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Update existing orders to have a company_id (using the creator's company)
UPDATE public.export_orders o
SET company_id = p.company_id
FROM public.profiles p
WHERE o.created_by = p.id AND o.company_id IS NULL;

-- 2. Update export_shipments
ALTER TABLE public.export_shipments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Link shipments to their parent order's company
UPDATE public.export_shipments s
SET company_id = o.company_id
FROM public.export_orders o
WHERE s.order_id = o.id AND s.company_id IS NULL;

-- 3. Update export_containers
ALTER TABLE public.export_containers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Link containers to their parent shipment's company
UPDATE public.export_containers c
SET company_id = s.company_id
FROM public.export_shipments s
WHERE c.shipment_id = s.id AND c.company_id IS NULL;

-- 4. Create View for Real-Time Shipment Analytics
CREATE OR REPLACE VIEW public.view_shipment_analytics AS
SELECT 
    company_id,
    COUNT(*) AS total_shipments,
    COUNT(*) FILTER (WHERE status = 'Delivered') AS delivered_shipments,
    COUNT(*) FILTER (WHERE status = 'Pending') AS pending_shipments,
    COUNT(*) FILTER (WHERE status = 'In Transit') AS in_transit_shipments,
    AVG(CASE WHEN status = 'Delivered' THEN EXTRACT(DAY FROM (updated_at - departure_date)) END) AS avg_transit_days
FROM public.export_shipments
GROUP BY company_id;

-- 5. Update RLS policies to be more secure (per-company)
DROP POLICY IF EXISTS "Allow all operations on export_shipments" ON public.export_shipments;
CREATE POLICY "Users can only access their company's shipments" ON public.export_shipments
FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow all operations on export_containers" ON public.export_containers;
CREATE POLICY "Users can only access their company's containers" ON public.export_containers
FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

NOTIFY pgrst, 'reload schema';
