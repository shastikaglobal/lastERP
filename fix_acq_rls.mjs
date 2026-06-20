import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFix() {
  const sql = `
    ALTER TABLE acquisition_channels ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "allow_all" ON acquisition_channels;
    CREATE POLICY "allow_all" ON acquisition_channels
    FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
  `;

  console.log('Attempting to run SQL via RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
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
