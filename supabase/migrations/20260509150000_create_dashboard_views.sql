-- Create dashboard views from export_orders and export_shipments
-- These power the Executive Dashboard charts

-- 1. Revenue by Month (for the Revenue Trend area chart)
CREATE OR REPLACE VIEW public.view_sales_by_month AS
SELECT
  TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
  DATE_TRUNC('month', created_at) AS month_date,
  COUNT(*) AS orders,
  SUM(total_amount) AS revenue,
  company_id
FROM public.export_orders
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at), company_id
ORDER BY month_date ASC;

-- 2. Revenue by Country (for the bar chart)
CREATE OR REPLACE VIEW public.view_revenue_by_country AS
SELECT
  customer_country AS country,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue,
  currency,
  company_id
FROM public.export_orders
WHERE customer_country IS NOT NULL AND customer_country != ''
GROUP BY customer_country, currency, company_id
ORDER BY revenue DESC;

-- 3. Shipment Status (for the pie chart)
CREATE OR REPLACE VIEW public.view_shipment_status AS
SELECT
  status AS name,
  COUNT(*) AS value,
  company_id
FROM public.export_shipments
GROUP BY status, company_id;

NOTIFY pgrst, 'reload schema';
