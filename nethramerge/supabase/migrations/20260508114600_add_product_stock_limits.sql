-- Add min_stock_level to products to support low stock alerts
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(14,3) DEFAULT 500.000;

-- Create a view for easy stock monitoring
CREATE OR REPLACE VIEW public.view_product_stock_levels AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.min_stock_level,
  COALESCE(SUM(b.quantity_remaining_kg), 0) as current_stock_kg,
  CASE 
    WHEN COALESCE(SUM(b.quantity_remaining_kg), 0) <= p.min_stock_level THEN 'low'
    WHEN COALESCE(SUM(b.quantity_remaining_kg), 0) <= p.min_stock_level * 1.5 THEN 'warning'
    ELSE 'healthy'
  END as stock_status
FROM public.products p
LEFT JOIN public.inventory_batches b ON b.product_id = p.id AND b.status = 'approved'
GROUP BY p.id, p.name, p.sku, p.min_stock_level;
