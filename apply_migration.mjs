import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  const migrationPath = 'd:/ERP4/supabase/migrations/20260601113215_create_tasks_table_v2.sql';
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration...');
  
  // Note: Most Supabase projects don't have a direct 'sql' execution RPC.
  // However, I can try to run it via the REST API if there's a workaround,
  // or simply advise the user to run it in the dashboard if I can't.
  
  // But wait, many projects use a specific RPC for this if they are set up for it.
  // Let's try to see if there's an 'exec_sql' or similar.
  
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    if (error.message.includes('function "execute_sql" does not exist')) {
      console.error('Error: execute_sql function not found in database. Please run the SQL manually in the Supabase Dashboard.');
    } else {
      console.error('Error executing SQL:', error);
    }
  } else {
    console.log('Migration applied successfully!');
  }
}

applyMigration();
