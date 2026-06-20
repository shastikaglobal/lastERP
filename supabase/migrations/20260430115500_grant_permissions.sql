-- ExportOS Phase 2: Grant Permissions
-- Run this in your Supabase SQL Editor to allow the API to read the views!

GRANT SELECT ON view_sales_by_month TO authenticated, anon;
GRANT SELECT ON view_revenue_by_country TO authenticated, anon;
GRANT SELECT ON view_shipment_status TO authenticated, anon;
