-- Optimize Warehouse Dashboard Performance with Additional Indexes
-- This migration adds composite indexes for common warehouse dashboard queries

-- Index for warehouse_id filtering on inventory_batches
CREATE INDEX IF NOT EXISTS idx_batch_warehouse 
  ON public.inventory_batches(warehouse_id, received_date DESC);

-- Index for is_export_ready and status filtering (used in export ready stock report)
CREATE INDEX IF NOT EXISTS idx_batch_export_ready 
  ON public.inventory_batches(company_id, is_export_ready, status);

-- Index for damage/wastage queries
CREATE INDEX IF NOT EXISTS idx_batch_damage_status 
  ON public.inventory_batches(company_id, status, received_date DESC)
  WHERE status IN ('damaged', 'rejected', 'quarantine', 'pending_qc');

-- Index for aging queries
CREATE INDEX IF NOT EXISTS idx_batch_aging 
  ON public.inventory_batches(company_id, received_date, quantity_remaining_kg)
  WHERE quantity_remaining_kg > 0;

-- Index for activity logs filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_date 
  ON public.activity_logs(company_id, created_at DESC);

-- Index for shipments today filtering
CREATE INDEX IF NOT EXISTS idx_shipments_created_status 
  ON public.shipments(status, created_at DESC)
  WHERE status = 'dispatched';

-- Index for export shipments filtering
CREATE INDEX IF NOT EXISTS idx_export_shipments_company_status 
  ON public.export_shipments(company_id, status, created_at DESC);

-- Index for inventory movements queries
CREATE INDEX IF NOT EXISTS idx_movements_batch 
  ON public.inventory_movements(batch_id, created_at DESC);

-- Optional: CLUSTER tables by most-used index for physical disk ordering
-- This can significantly improve performance for range queries
-- Note: Uncomment if you want to reorder physical data (requires write lock)
-- CLUSTER public.inventory_batches USING idx_batch_export_ready;
-- CLUSTER public.shipments USING idx_shipments_created_status;
