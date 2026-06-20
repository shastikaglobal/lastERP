-- ExportOS Phase 2: Disable RLS for Customer Demo
-- Run this in your Supabase SQL Editor so you can see the seed data!

-- Disable Row Level Security so the frontend can read the seed data regardless of which user is logged in
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications DISABLE ROW LEVEL SECURITY;
