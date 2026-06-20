-- Dynamic migration to alter all foreign keys referencing auth.users or public.profiles
-- to ON DELETE CASCADE (for metadata/roles/attendance or NOT NULL columns) or ON DELETE SET NULL.
DO $$
DECLARE
    r RECORD;
    sql_drop TEXT;
    sql_add TEXT;
    v_is_nullable TEXT;
BEGIN
    FOR r IN 
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND (ccu.table_name = 'users' AND ccu.table_schema = 'auth' 
               OR ccu.table_name = 'profiles' AND ccu.table_schema = 'public')
    LOOP
        -- Check if the column is nullable
        SELECT is_nullable INTO v_is_nullable
        FROM information_schema.columns 
        WHERE table_schema = r.table_schema 
          AND table_name = r.table_name 
          AND column_name = r.column_name;

        DECLARE
            action_type TEXT := 'SET NULL';
        BEGIN
            -- If column is NOT NULL, we MUST use CASCADE because SET NULL violates the NOT NULL constraint.
            -- Also use CASCADE for known tables that should be cleaned up.
            IF v_is_nullable = 'NO' OR r.table_name IN ('profiles', 'user_roles', 'attendance_logs', 'attendance', 'active_sessions', 'app_notifications', 'team_chat') THEN
                action_type := 'CASCADE';
            END IF;

            sql_drop := 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
                        ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
            EXECUTE sql_drop;

            sql_add := 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
                       ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || 
                       ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES ' || 
                       quote_ident(r.foreign_table_schema) || '.' || quote_ident(r.foreign_table_name) || 
                       '(' || quote_ident(r.foreign_column_name) || ') ON DELETE ' || action_type;
            EXECUTE sql_add;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to modify constraint % on table %: %', r.constraint_name, r.table_name, SQLERRM;
        END;
    END LOOP;
END $$;
