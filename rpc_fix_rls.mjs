import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFix() {
  const sql = `
    DROP POLICY IF EXISTS "Users can insert their own reports" ON public.bde_daily_reports;
    DROP POLICY IF EXISTS "Allow authenticated insert" ON public.bde_daily_reports;
    CREATE POLICY "Allow authenticated insert"
    ON public.bde_daily_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow authenticated select" ON public.bde_daily_reports;
    CREATE POLICY "Allow authenticated select"
    ON public.bde_daily_reports
    FOR SELECT
    TO authenticated
    USING (true);
  `;

  console.log('Attempting to run SQL via RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  // Some projects use 'sql' or 'query' or 'sql_query'
  
  if (error) {
    console.log('RPC failed (likely not exists):', error.message);
    
    // Try another parameter name
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: sql });
    if (error2) console.log('RPC failed again:', error2.message);
    else console.log('RPC worked with "sql" parameter!');
  } else {
    console.log('RPC worked with "sql_query" parameter!');
  }
}

runFix();
