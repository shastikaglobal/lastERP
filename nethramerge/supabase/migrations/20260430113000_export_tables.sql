-- ExportOS Phase 2: Live Database Schema & Seed Data
-- Run this in your Supabase SQL Editor

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled');
    CREATE TYPE shipment_status AS ENUM ('Pending', 'Processing', 'In Transit', 'Delivered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tables
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  order_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status order_status DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  order_id UUID REFERENCES sales_orders(id),
  tracking_number TEXT NOT NULL,
  destination TEXT,
  status shipment_status DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  type TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Views for Dashboard Analytics
CREATE OR REPLACE VIEW view_sales_by_month AS
SELECT 
  company_id,
  to_char(date_trunc('month', created_at), 'Mon') AS month,
  SUM(amount) AS revenue,
  COUNT(id) AS orders
FROM sales_orders
GROUP BY company_id, date_trunc('month', created_at)
ORDER BY date_trunc('month', created_at);

CREATE OR REPLACE VIEW view_revenue_by_country AS
SELECT 
  s.company_id,
  cu.country,
  SUM(s.amount) AS revenue
FROM sales_orders s
JOIN customers cu ON s.customer_id = cu.id
GROUP BY s.company_id, cu.country;

CREATE OR REPLACE VIEW view_shipment_status AS
SELECT 
  company_id,
  status::text AS name,
  COUNT(id) AS value
FROM shipments
GROUP BY company_id, status;

-- 4. Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- Basic Policies for authenticated users to view their company's data
CREATE POLICY "Users can view their company customers" ON customers FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE company_id = customers.company_id));
CREATE POLICY "Users can view their company sales" ON sales_orders FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE company_id = sales_orders.company_id));
CREATE POLICY "Users can view their company shipments" ON shipments FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE company_id = shipments.company_id));
CREATE POLICY "Users can view their company notifications" ON app_notifications FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE company_id = app_notifications.company_id));
