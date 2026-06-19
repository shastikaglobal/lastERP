-- Ensure export_orders is accessible
ALTER TABLE public.export_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on export_orders" ON public.export_orders;
CREATE POLICY "Allow all operations on export_orders" ON public.export_orders FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
