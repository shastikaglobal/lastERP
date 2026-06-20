-- Allow public read access to export_shipments and export_orders for invoice preview links
CREATE POLICY "Public read export_shipments" ON public.export_shipments FOR SELECT USING (true);
CREATE POLICY "Public read export_orders" ON public.export_orders FOR SELECT USING (true);
