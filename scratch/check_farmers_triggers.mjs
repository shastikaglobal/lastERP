import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const { Pool } = pg;

async function checkVPS() {
  console.log('--- Checking VPS Database ---');
  const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: parseInt(process.env.PG_PORT || '5432'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check triggers on farmers table
    const { rows: triggers } = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'farmers';
    `);
    console.log('Triggers on farmers table:');
    console.log(JSON.stringify(triggers, null, 2));

    // Check triggers on customers table
    const { rows: custTriggers } = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'customers';
    `);
    console.log('Triggers on customers table:');
    console.log(JSON.stringify(custTriggers, null, 2));

  } catch (err) {
    console.error('VPS Query Error:', err);
  } finally {
    await pool.end();
  }
}

async function checkSupabase() {
  console.log('\n--- Checking Supabase Database ---');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase credentials missing.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // We cannot query information_schema directly through supabase JS client easily,
    // but we can query using an RPC if it exists, or check tables directly.
    // Let's see if we can do an RPC call or run queries via a standard postgrest query?
    // Wait, let's try to query the REST endpoint for schemas if possible, or we can use pg connection to Supabase!
    // Supabase DB connection string can be derived or we can connect using database URL if we have one.
    // In .env, we have VITE_SUPABASE_PROJECT_ID.
    // Supabase DB is usually: postgresql://postgres.sxebygxpjzntogzpjnga:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
    // But since we don't have the password, we can run a SQL command or check the sync logs.
    // Wait, let's run a query on VPS database first, as the VPS database might have its own triggers.
  } catch (err) {
    console.error('Supabase Query Error:', err);
  }
}

async function main() {
  await checkVPS();
}

main();
