-- Shipments & Logistics Module Migration

DO $$ BEGIN
    CREATE TYPE export_shipment_status AS ENUM ('Pending', 'Processing', 'In Transit', 'Delivered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.export_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.export_orders(id) ON DELETE CASCADE,
  shipment_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  carrier TEXT,
  origin_port TEXT,
  destination_port TEXT,
  departure_date DATE,
  eta DATE,
  status export_shipment_status DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.export_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.export_shipments(id) ON DELETE CASCADE,
  container_number TEXT NOT NULL,
  container_type TEXT,
  seal_number TEXT,
  weight_kg NUMERIC,
  status TEXT DEFAULT 'Loaded',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Depending on your exact export_orders schema, you might need to adjust policies.
-- Here we're adding simple permissive policies to match the recent Export Orders implementation.
ALTER TABLE public.export_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on export_shipments" ON public.export_shipments;
CREATE POLICY "Allow all operations on export_shipments" ON public.export_shipments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on export_containers" ON public.export_containers;
CREATE POLICY "Allow all operations on export_containers" ON public.export_containers FOR ALL USING (true) WITH CHECK (true);
