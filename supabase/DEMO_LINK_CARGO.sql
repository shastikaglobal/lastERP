-- ================================================================
-- FIXED DEMO SCRIPT: Link barcodes to shipments
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Ensure columns exist in batch_barcodes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batch_barcodes' AND column_name='shipment_id') THEN
    ALTER TABLE public.batch_barcodes ADD COLUMN shipment_id UUID REFERENCES public.export_shipments(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batch_barcodes' AND column_name='container_id') THEN
    ALTER TABLE public.batch_barcodes ADD COLUMN container_id UUID REFERENCES public.export_containers(id);
  END IF;
END $$;

-- 2. Link the first 5 barcodes to the most recent shipment
UPDATE public.batch_barcodes
SET 
  shipment_id = (SELECT id FROM public.export_shipments ORDER BY created_at DESC LIMIT 1),
  current_location = 'packing',
  status = 'Active'
WHERE id IN (SELECT id FROM public.batch_barcodes LIMIT 5);

-- 3. Add tracking events to show in the timeline
INSERT INTO public.shipment_events (company_id, shipment_id, event_type, title, description, location)
SELECT 
  company_id, 
  id, 
  'container_loaded', 
  'Cargo Scanning Started', 
  'Initial batch of 5 barcodes linked to this shipment.',
  origin_port
FROM public.export_shipments 
ORDER BY created_at DESC 
LIMIT 1;

SELECT 'Success! Barcodes are now linked. Go check your shipment page.' as result;
