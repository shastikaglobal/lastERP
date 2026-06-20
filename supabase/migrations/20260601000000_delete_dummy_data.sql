-- Delete dummy data for sales analytics dashboard
-- This migration removes sample data from export tables used by the dashboard.
-- Run after any seed scripts if you want a clean state.

-- Delete from export_orders (used by view_sales_by_month)
DELETE FROM public.export_orders;

-- Delete from export_shipments (used by shipment analytics)
DELETE FROM public.export_shipments;

-- Delete from export_containers if exists
DELETE FROM public.export_containers;

-- Refresh schema cache for Supabase PostgREST
NOTIFY pgrst, 'reload schema';
