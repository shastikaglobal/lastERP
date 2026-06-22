import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const { Pool } = pg;

async function checkVPS() {
  console.log('=== VPS Recent Farmers ===');
  const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: parseInt(process.env.PG_PORT || '5432'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    const { rows: farmers } = await pool.query(`
      SELECT id, full_name, email, phone, created_at, is_deleted
      FROM farmers
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    console.log(farmers);

    console.log('\n=== VPS Recent Customers ===');
    const { rows: customers } = await pool.query(`
      SELECT id, name, email, phone, farmer_id, created_at
      FROM customers
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    console.log(customers);

    console.log('\n=== VPS Customers linked to any farmer_id ===');
    const { rows: linked } = await pool.query(`
      SELECT c.id as customer_id, c.name as customer_name, c.email as customer_email, f.id as farmer_id, f.full_name as farmer_name
      FROM customers c
      JOIN farmers f ON c.farmer_id = f.id;
    `);
    console.log(linked);

  } catch (err) {
    console.error('VPS Query Error:', err);
  } finally {
    await pool.end();
  }
}

async function checkSupabase() {
  console.log('\n=== Supabase Recent Farmers ===');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase credentials missing.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: farmers, error: fErr } = await supabase
      .from('farmers')
      .select('id, full_name, email, phone, created_at, is_deleted')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fErr) throw fErr;
    console.log(farmers);

    console.log('\n=== Supabase Recent Customers ===');
    const { data: customers, error: cErr } = await supabase
      .from('customers')
      .select('id, name, email, phone, farmer_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (cErr) throw cErr;
    console.log(customers);

    console.log('\n=== Supabase Customers with non-null farmer_id ===');
    const { data: linked, error: lErr } = await supabase
      .from('customers')
      .select('id, name, email, farmer_id')
      .not('farmer_id', 'is', null);

    if (lErr) throw lErr;
    console.log(linked);

  } catch (err) {
    console.error('Supabase Query Error:', err);
  }
}

async function main() {
  await checkVPS();
  await checkSupabase();
}

main();
