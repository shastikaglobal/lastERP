-- Backfill Stock Movements from existing data
INSERT INTO public.inventory_movements (company_id, sku, direction, qty, reference, warehouse, date)
SELECT 
  b.company_id, 
  p.name as sku, 
  'in' as direction, 
  b.quantity_kg as qty, 
  'LOT: ' || b.lot_number as reference, 
  w.name as warehouse,
  b.created_at as date
FROM public.inventory_batches b
JOIN public.products p ON p.id = b.product_id
LEFT JOIN public.warehouses w ON w.id = b.warehouse_id;

INSERT INTO public.inventory_movements (company_id, sku, direction, qty, reference, warehouse, date)
SELECT 
  o.company_id, 
  o.product as sku, 
  'out' as direction, 
  o.quantity as qty, 
  'SHP: ' || s.shipment_number as reference, 
  s.origin_port as warehouse,
  s.created_at as date
FROM public.export_shipments s
JOIN public.export_orders o ON o.id = s.order_id;
