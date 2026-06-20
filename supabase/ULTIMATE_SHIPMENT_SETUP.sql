-- ================================================================
-- ULTIMATE SETUP: One script to fix everything
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Create Shipment Events Table (if missing)
CREATE TABLE IF NOT EXISTS public.shipment_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.export_shipments(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add Link Columns to Barcodes (if missing)
ALTER TABLE public.batch_barcodes ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES public.export_shipments(id);
ALTER TABLE public.batch_barcodes ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES public.export_containers(id);

-- 3. Link some barcodes to your most recent shipment automatically
UPDATE public.batch_barcodes
SET 
  shipment_id = (SELECT id FROM public.export_shipments ORDER BY created_at DESC LIMIT 1),
  current_location = 'dispatch'
WHERE id IN (SELECT id FROM public.batch_barcodes LIMIT 10);

-- 4. Create a "Shipment Started" event for the timeline
INSERT INTO public.shipment_events (company_id, shipment_id, event_type, title, description, location)
SELECT 
  company_id, id, 'created', 'Shipment Tracking Started', 
  'This shipment is now being tracked via barcode scanning.', origin_port
FROM public.export_shipments 
ORDER BY created_at DESC LIMIT 1;

-- 5. Fix RLS (Security) so you can see the data
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for demo" ON public.shipment_events;
CREATE POLICY "Public access for demo" ON public.shipment_events FOR ALL USING (true);

SELECT 'All systems ready! Check your Shipment Detail page now.' as status;
