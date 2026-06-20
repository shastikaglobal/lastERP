import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

// VPS Config
const DB_CONFIG = {
  user:     process.env.PG_USER     || 'postgres',
  host:     process.env.PG_HOST     || '195.35.22.13',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD || 'Shastika2026',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  connectionTimeoutMillis: 8000,
};

// Supabase Config
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function clearVps() {
  console.log(`🌐 Connecting to VPS DB ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}...`);
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log("⚡ VPS DB Connected! Beginning cleanup transaction...");
    await client.query('BEGIN');

    // Delete in order of foreign key dependencies
    const queries = [
      'DELETE FROM qc_inspections',
      'DELETE FROM export_containers',
      'DELETE FROM export_shipments',
      'DELETE FROM inventory_batches',
      'DELETE FROM purchase_order_items',
      'DELETE FROM purchase_orders',
      'DELETE FROM drivers',
      'DELETE FROM vehicles'
    ];

    for (const q of queries) {
      const res = await client.query(q);
      console.log(`  🗑️ Executed: "${q}" -> Deleted ${res.rowCount} rows.`);
    }

    await client.query('COMMIT');
    console.log("✅ VPS database cleanup committed successfully!");
  } catch (err) {
    console.error("❌ VPS DB cleanup failed, rolling back:", err.message);
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
  } finally {
    await client.end();
  }
}

async function clearSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("⚠️ Supabase credentials missing. Skipping Supabase cleanup.");
    return;
  }
  console.log(`\n⚡ Connecting to Supabase ${supabaseUrl}...`);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const SUPABASE_TABLES = [
    'farmers',
    'payments',
    'export_orders',
    'leads',
    'bde_daily_reports'
  ];

  for (const table of SUPABASE_TABLES) {
    try {
      console.log(`  🧹 Clearing Supabase table "${table}"...`);
      const { data, error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all records
      
      if (error) throw error;
      console.log(`  ✅ Cleared table "${table}".`);
    } catch (err) {
      console.error(`  ❌ Failed to clear Supabase table "${table}":`, err.message);
    }
  }
}

async function main() {
  await clearVps();
  await clearSupabase();
  console.log("\n🎉 Full ERP database cleanup finished successfully!");
}

main();
