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

const VPS_TABLES = [
  'inventory_batches',
  'qc_inspections',
  'purchase_orders',
  'purchase_order_items',
  'export_shipments',
  'export_containers',
  'vehicles',
  'drivers'
];

const SUPABASE_TABLES = [
  'farmers',
  'payments',
  'export_orders',
  'leads',
  'bde_daily_reports'
];

async function checkVps() {
  console.log(`🌐 Connecting to VPS DB ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}...`);
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log("✅ VPS DB Connected! Fetching row counts...");
    for (const table of VPS_TABLES) {
      try {
        const { rows } = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  📊 [VPS] ${table}: ${rows[0].count} rows`);
      } catch (err) {
        console.log(`  ⚠️ Could not query VPS table "${table}": ${err.message}`);
      }
    }
  } catch (err) {
    console.error("❌ Failed to connect to VPS:", err.message);
  } finally {
    await client.end();
  }
}

async function checkSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("⚠️ Supabase credentials missing in .env");
    return;
  }
  console.log(`\n⚡ Connecting to Supabase ${supabaseUrl}...`);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  for (const table of SUPABASE_TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      console.log(`  📊 [Supabase] ${table}: ${count} rows`);
    } catch (err) {
      console.log(`  ⚠️ Could not query Supabase table "${table}": ${err.message}`);
    }
  }
}

async function main() {
  await checkVps();
  await checkSupabase();
}

main();
