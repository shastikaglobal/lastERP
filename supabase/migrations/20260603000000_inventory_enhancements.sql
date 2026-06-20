-- Migration to enhance Inventory Management: Expiry, Reserved Stock, and Damaged Goods
-- 1. Add 'damaged' to batch_status enum
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'damaged';

-- 2. Add quantity_reserved_kg and damaged_notes to inventory_batches
ALTER TABLE public.inventory_batches 
ADD COLUMN IF NOT EXISTS quantity_reserved_kg NUMERIC(14,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS damaged_notes TEXT,
ADD COLUMN IF NOT EXISTS is_export_ready BOOLEAN DEFAULT FALSE;

-- 3. Update the record_inventory_movement to handle reservations if needed
-- (Assuming public.record_inventory_movement is a helper function elsewhere)

-- 4. Create a view or helper for 'Available vs Reserved' stock
CREATE OR REPLACE VIEW public.inventory_stock_summary AS
SELECT 
  product_id,
  warehouse_id,
  SUM(quantity_remaining_kg) as total_physical_stock,
  SUM(quantity_reserved_kg) as total_reserved_stock,
  SUM(quantity_remaining_kg - quantity_reserved_kg) as net_available_stock,
  COUNT(id) FILTER (WHERE expiry_date < (CURRENT_DATE + INTERVAL '30 days')) as near_expiry_batches,
  COUNT(id) FILTER (WHERE status = 'damaged') as damaged_batches
FROM public.inventory_batches
GROUP BY product_id, warehouse_id;

-- Refresh PostgREST
NOTIFY pgrst, 'reload schema';
