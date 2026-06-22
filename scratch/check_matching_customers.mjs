import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const { Pool } = pg;

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase credentials missing.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, email, created_at');

    if (error) throw error;

    console.log('--- All Supabase Customers ---');
    console.log(customers);

    console.log('\n--- All Supabase Farmers ---');
    const { data: farmers, error: fErr } = await supabase
      .from('farmers')
      .select('id, full_name, email, is_deleted');
    if (fErr) throw fErr;
    console.log(farmers);

  } catch (err) {
    console.error('Error querying Supabase:', err);
  }
}

run();
