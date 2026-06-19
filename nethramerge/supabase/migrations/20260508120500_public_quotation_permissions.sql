-- Allow public read access for shared quotation links
CREATE POLICY "Public read quotations" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "Public read quotation_items" ON public.quotation_items FOR SELECT USING (true);

-- Also need public read for companies and products to show names in the public view
CREATE POLICY "Public read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public read customers" ON public.customers FOR SELECT USING (true);
