-- Dynamically update all foreign keys pointing to public.leads to support ON DELETE CASCADE or ON DELETE SET NULL
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            tc.constraint_name,
            kcu.column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'leads'
            AND ccu.table_schema = 'public'
    LOOP
        -- Drop the constraint
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I;', r.table_schema, r.table_name, r.constraint_name);
        
        -- Re-add the constraint with CASCADE or SET NULL
        IF r.table_name = 'quotations' THEN
            EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.leads(id) ON DELETE SET NULL;', 
                           r.table_schema, r.table_name, r.constraint_name, r.column_name);
        ELSE
            EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.leads(id) ON DELETE CASCADE;', 
                           r.table_schema, r.table_name, r.constraint_name, r.column_name);
        END IF;
    END LOOP;
END $$;
