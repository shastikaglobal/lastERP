DO $$ BEGIN
    -- Add public read policy for export_shipments
    DROP POLICY IF EXISTS "Public read export_shipments" ON public.export_shipments;
    CREATE POLICY "Public read export_shipments" ON public.export_shipments FOR SELECT USING (true);

    -- Add public read policy for export_orders
    DROP POLICY IF EXISTS "Public read export_orders" ON public.export_orders;
    CREATE POLICY "Public read export_orders" ON public.export_orders FOR SELECT USING (true);

    -- Add public read policy for invoices (if the table exists)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        DROP POLICY IF EXISTS "Public read invoices" ON public.invoices;
        CREATE POLICY "Public read invoices" ON public.invoices FOR SELECT USING (true);
    END IF;
END $$;
