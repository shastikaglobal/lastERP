-- Inventory Movements Tracking
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  date TIMESTAMPTZ DEFAULT NOW(),
  sku TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  qty NUMERIC NOT NULL,
  reference TEXT,
  warehouse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on inventory_movements" ON public.inventory_movements;
CREATE POLICY "Allow all operations on inventory_movements" ON public.inventory_movements FOR ALL USING (true) WITH CHECK (true);

-- Function to record movement
CREATE OR REPLACE FUNCTION public.record_inventory_movement(
  _company_id UUID,
  _sku TEXT,
  _direction TEXT,
  _qty NUMERIC,
  _reference TEXT,
  _warehouse TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.inventory_movements (company_id, sku, direction, qty, reference, warehouse)
  VALUES (_company_id, _sku, _direction, _qty, _reference, _warehouse);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
