-- =========================================================================
-- MEGA INSTALL SCRIPT (BULLETPROOF VERSION)
-- =========================================================================

-- 1. Create Core Tables (including companies if missing)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  order_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  order_id UUID REFERENCES sales_orders(id),
  tracking_number TEXT,
  destination TEXT,
  status TEXT DEFAULT 'Processing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Views for the Dashboard
DROP VIEW IF EXISTS view_sales_by_month;
CREATE OR REPLACE VIEW view_sales_by_month AS
SELECT 
  company_id,
  to_char(created_at, 'Mon') as month,
  EXTRACT(MONTH FROM created_at) as month_num,
  SUM(amount) as revenue
FROM sales_orders
GROUP BY company_id, to_char(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
ORDER BY month_num;

DROP VIEW IF EXISTS view_revenue_by_country;
CREATE OR REPLACE VIEW view_revenue_by_country AS
SELECT 
  c.company_id,
  c.country as name,
  SUM(s.amount) as value
FROM customers c
JOIN sales_orders s ON c.id = s.customer_id
GROUP BY c.company_id, c.country;

DROP VIEW IF EXISTS view_shipment_status;
CREATE OR REPLACE VIEW view_shipment_status AS
SELECT 
  company_id,
  status as name,
  COUNT(*) as value
FROM shipments
GROUP BY company_id, status;

-- 3. Grant Permissions
GRANT SELECT ON view_sales_by_month TO authenticated, anon;
GRANT SELECT ON view_revenue_by_country TO authenticated, anon;
GRANT SELECT ON view_shipment_status TO authenticated, anon;

-- 4. Disable RLS for Demo
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications DISABLE ROW LEVEL SECURITY;

-- 5. Force Schema Reload
NOTIFY pgrst, 'reload schema';

-- 6. Insert Bulletproof Seed Data
DO $$
DECLARE
    target_company_id UUID;
    cust1_id UUID;
    cust2_id UUID;
    cust3_id UUID;
    order1_id UUID;
    order2_id UUID;
    order3_id UUID;
BEGIN
    -- Ensure at least one company exists
    SELECT id INTO target_company_id FROM companies LIMIT 1;
    IF target_company_id IS NULL THEN
        INSERT INTO companies (name) VALUES ('Shastika Global Demo') RETURNING id INTO target_company_id;
    END IF;

    -- Clear old data to avoid duplicates
    DELETE FROM shipments WHERE company_id = target_company_id;
    DELETE FROM sales_orders WHERE company_id = target_company_id;
    DELETE FROM customers WHERE company_id = target_company_id;

    -- Insert Customers
    INSERT INTO customers (company_id, name, country) VALUES 
        (target_company_id, 'Mumbai Textiles Ltd', 'India') RETURNING id INTO cust1_id;
    INSERT INTO customers (company_id, name, country) VALUES 
        (target_company_id, 'Berlin Auto GmbH', 'Germany') RETURNING id INTO cust2_id;
    INSERT INTO customers (company_id, name, country) VALUES 
        (target_company_id, 'Osaka Electronics', 'Japan') RETURNING id INTO cust3_id;

    -- Insert Sales Orders
    INSERT INTO sales_orders (company_id, customer_id, order_number, amount, status, created_at) VALUES 
        (target_company_id, cust1_id, 'SO-1001', 412000, 'Delivered', NOW() - INTERVAL '5 months') RETURNING id INTO order1_id;
    INSERT INTO sales_orders (company_id, customer_id, order_number, amount, status, created_at) VALUES 
        (target_company_id, cust2_id, 'SO-1002', 892000, 'Shipped', NOW() - INTERVAL '1 month') RETURNING id INTO order2_id;
    INSERT INTO sales_orders (company_id, customer_id, order_number, amount, status, created_at) VALUES 
        (target_company_id, cust3_id, 'SO-1003', 728000, 'Processing', NOW()) RETURNING id INTO order3_id;

    -- Insert Shipments
    INSERT INTO shipments (company_id, order_id, tracking_number, destination, status) VALUES 
        (target_company_id, order1_id, 'TRK-9901', 'Hamburg, DE', 'Delivered');
    INSERT INTO shipments (company_id, order_id, tracking_number, destination, status) VALUES 
        (target_company_id, order2_id, 'TRK-9902', 'Osaka, JP', 'In Transit');
    INSERT INTO shipments (company_id, order_id, tracking_number, destination, status) VALUES 
        (target_company_id, order3_id, 'TRK-9903', 'Mumbai, IN', 'Processing');
END $$;
