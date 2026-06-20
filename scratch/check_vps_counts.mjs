import pg from 'pg';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

const DB_CONFIG = {
  user:     process.env.PG_USER     || 'postgres',
  host:     process.env.PG_HOST     || '195.35.22.13',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD || 'Shastika2026',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  connectionTimeoutMillis: 8000,
};

const TABLES = [
  'farmers',
  'qc_inspections',
  'inventory_batches',
  'purchase_orders',
  'purchase_order_items',
  'export_orders',
  'export_shipments',
  'export_containers',
  'payments',
  'leads'
];

async function run() {
  console.log(`🌐 Connecting to live DB ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}...`);
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log("✅ Connected! Fetching row counts...");

    for (const table of TABLES) {
      try {
        const { rows } = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`📊 ${table}: ${rows[0].count} rows`);
      } catch (err) {
        console.log(`⚠️ Could not query table "${table}": ${err.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to connect or query:", error);
  } finally {
    await client.end();
  }
}

run();
