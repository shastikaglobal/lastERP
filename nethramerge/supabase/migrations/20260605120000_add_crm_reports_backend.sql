-- 1. Weekly Performance Report Function
CREATE OR REPLACE FUNCTION public.get_weekly_performance_report(
  start_date timestamptz,
  end_date timestamptz,
  bde_id_param text DEFAULT 'all'
)
RETURNS TABLE (
  total_leads_handled bigint,
  follow_up_completed_count bigint,
  total_follow_ups bigint,
  follow_up_completion_rate numeric,
  meetings_arranged bigint,
  quotations_submitted bigint,
  new_customers_acquired bigint,
  revenue_generated numeric,
  target_amount numeric,
  target_achieved_percentage numeric
) AS $$
DECLARE
  v_leads_count bigint;
  v_follow_ups_completed bigint;
  v_follow_ups_total bigint;
  v_completion_rate numeric;
  v_meetings_count bigint;
  v_quotes_count bigint;
  v_customers_acquired bigint;
  v_revenue numeric;
  v_target numeric;
  v_target_achieved numeric;
BEGIN
  -- Total leads handled (created or assigned in range)
  SELECT COUNT(*) INTO v_leads_count
  FROM public.leads
  WHERE created_at BETWEEN start_date AND end_date
    AND (bde_id_param = 'all' OR assigned_to = bde_id_param::text);

  -- Follow-ups in range
  SELECT COUNT(*), COUNT(CASE WHEN is_notified = true THEN 1 END)
  INTO v_follow_ups_total, v_follow_ups_completed
  FROM public.follow_ups
  WHERE created_at BETWEEN start_date AND end_date
    AND (bde_id_param = 'all' OR assigned_to = bde_id_param);

  IF v_follow_ups_total > 0 THEN
    v_completion_rate := ROUND((v_follow_ups_completed::numeric / v_follow_ups_total::numeric) * 100, 2);
  ELSE
    v_completion_rate := 0.0;
  END IF;

  -- Meetings arranged (activities of type meeting)
  SELECT COUNT(*) INTO v_meetings_count
  FROM public.activities
  WHERE type = 'meeting'
    AND created_at BETWEEN start_date AND end_date
    AND (bde_id_param = 'all' OR created_by = bde_id_param);

  -- Quotations submitted
  SELECT COUNT(*) INTO v_quotes_count
  FROM public.quotations
  WHERE created_at BETWEEN start_date AND end_date
    AND (bde_id_param = 'all' OR created_by = bde_id_param);

  -- New customers acquired (won leads or client acquisitions)
  SELECT COUNT(*) INTO v_customers_acquired
  FROM public.client_acquisition
  WHERE acquisition_date BETWEEN start_date::date AND end_date::date
    AND (bde_id_param = 'all' OR assigned_bde::text = bde_id_param);

  -- Revenue generated (sum of total_amount of export orders placed)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_revenue
  FROM public.export_orders
  WHERE order_date BETWEEN start_date::date AND end_date::date
    AND (bde_id_param = 'all' OR created_by = bde_id_param);

  -- Target: monthly target / 4 for weekly, or full monthly target depending on view. Let's use monthly target / 4 as weekly target.
  IF bde_id_param = 'all' THEN
    SELECT COALESCE(SUM(monthly_target), 0) / 4 INTO v_target
    FROM public.profiles;
  ELSE
    SELECT COALESCE(monthly_target, 0) / 4 INTO v_target
    FROM public.profiles
    WHERE id = bde_id_param::uuid;
  END IF;

  IF v_target > 0 THEN
    v_target_achieved := ROUND((v_revenue / v_target) * 100, 2);
  ELSE
    v_target_achieved := 0.0;
  END IF;

  RETURN QUERY
  SELECT 
    v_leads_count,
    v_follow_ups_completed,
    v_follow_ups_total,
    v_completion_rate,
    v_meetings_count,
    v_quotes_count,
    v_customers_acquired,
    v_revenue,
    v_target,
    v_target_achieved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Monthly Sales Report Functions
CREATE OR REPLACE FUNCTION public.get_monthly_sales_report(
  month_date text, -- Format: 'YYYY-MM'
  bde_id_param text DEFAULT 'all'
)
RETURNS TABLE (
  monthly_sales_value numeric,
  total_orders bigint,
  new_clients_acquired bigint,
  repeat_customers_count bigint,
  target_amount numeric,
  target_achieved_percentage numeric
) AS $$
DECLARE
  v_sales_value numeric;
  v_orders_count bigint;
  v_new_clients bigint;
  v_repeat_cust bigint;
  v_target numeric;
  v_target_achieved numeric;
BEGIN
  -- Monthly sales value
  SELECT COALESCE(SUM(total_amount), 0) INTO v_sales_value
  FROM public.export_orders
  WHERE TO_CHAR(order_date, 'YYYY-MM') = month_date
    AND (bde_id_param = 'all' OR created_by = bde_id_param);

  -- Total orders
  SELECT COUNT(*) INTO v_orders_count
  FROM public.export_orders
  WHERE TO_CHAR(order_date, 'YYYY-MM') = month_date
    AND (bde_id_param = 'all' OR created_by = bde_id_param);

  -- New clients acquired
  SELECT COUNT(*) INTO v_new_clients
  FROM public.client_acquisition
  WHERE TO_CHAR(acquisition_date, 'YYYY-MM') = month_date
    AND (bde_id_param = 'all' OR assigned_bde::text = bde_id_param);

  -- Repeat customers (customers who have > 1 order overall in export_orders)
  SELECT COUNT(*) INTO v_repeat_cust
  FROM (
    SELECT customer_name
    FROM public.export_orders
    WHERE (bde_id_param = 'all' OR created_by = bde_id_param)
    GROUP BY customer_name
    HAVING COUNT(*) > 1
  ) AS repeat_customers;

  -- Sales target
  IF bde_id_param = 'all' THEN
    SELECT COALESCE(SUM(monthly_target), 0) INTO v_target
    FROM public.profiles;
  ELSE
    SELECT COALESCE(monthly_target, 0) INTO v_target
    FROM public.profiles
    WHERE id = bde_id_param::uuid;
  END IF;

  IF v_target > 0 THEN
    v_target_achieved := ROUND((v_sales_value / v_target) * 100, 2);
  ELSE
    v_target_achieved := 0.0;
  END IF;

  RETURN QUERY
  SELECT 
    v_sales_value,
    v_orders_count,
    v_new_clients,
    v_repeat_cust,
    v_target,
    v_target_achieved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Monthly Sales Product Breakdown Function
CREATE OR REPLACE FUNCTION public.get_monthly_top_products(
  month_date text,
  bde_id_param text DEFAULT 'all'
)
RETURNS TABLE (
  product_name text,
  total_quantity numeric,
  total_revenue numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    product,
    SUM(quantity)::numeric AS total_quantity,
    SUM(total_amount)::numeric AS total_revenue
  FROM public.export_orders
  WHERE TO_CHAR(order_date, 'YYYY-MM') = month_date
    AND (bde_id_param = 'all' OR created_by = bde_id_param)
  GROUP BY product
  ORDER BY total_revenue DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Monthly Sales Country Breakdown Function
CREATE OR REPLACE FUNCTION public.get_monthly_country_sales(
  month_date text,
  bde_id_param text DEFAULT 'all'
)
RETURNS TABLE (
  country_name text,
  total_revenue numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    customer_country AS country_name,
    SUM(total_amount)::numeric AS total_revenue
  FROM public.export_orders
  WHERE TO_CHAR(order_date, 'YYYY-MM') = month_date
    AND (bde_id_param = 'all' OR created_by = bde_id_param)
    AND customer_country IS NOT NULL
  GROUP BY customer_country
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger schema cache reload
NOTIFY pgrst, 'reload schema';
