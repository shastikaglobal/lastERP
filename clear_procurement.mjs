/**
 * clear_procurement.mjs — Clear all test/dummy Procurement data from the live database for launch
 * Usage: node clear_procurement.mjs
 */

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

async function run() {
  console.log(`🌐 Connecting to live DB ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}...`);
  const client = new Client(DB_CONFIG);
  await client.connect();

  try {
    console.log("⚡ Starting transaction to clean up procurement data...");
    await client.query('BEGIN');

    // 1. Clear qc_inspections
    const delQcRes = await client.query('DELETE FROM qc_inspections');
    console.log(`🗑️ Deleted ${delQcRes.rowCount} rows from qc_inspections.`);

    // 2. Clear inventory_batches
    const delInvRes = await client.query('DELETE FROM inventory_batches');
    console.log(`🗑️ Deleted ${delInvRes.rowCount} rows from inventory_batches.`);

    // 3. Clear purchase_order_items
    const delPoItemsRes = await client.query('DELETE FROM purchase_order_items');
    console.log(`🗑️ Deleted ${delPoItemsRes.rowCount} rows from purchase_order_items.`);

    // 4. Clear purchase_orders
    const delPoRes = await client.query('DELETE FROM purchase_orders');
    console.log(`🗑️ Deleted ${delPoRes.rowCount} rows from purchase_orders.`);

    // 5. Clear farmers (which acts as suppliers in the dashboard)
    const delFarmersRes = await client.query('DELETE FROM farmers');
    console.log(`🗑️ Deleted ${delFarmersRes.rowCount} rows from farmers.`);

    await client.query('COMMIT');
    console.log("\n🎉 Procurement cleanup complete! All tables have been successfully cleared in live DB.");
  } catch (error) {
    console.log("⚠️ An error occurred, rolling back changes...");
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error("Failed to rollback", rbErr);
    }
    console.error("❌ Cleanup failed! Transaction rolled back.", error);
  } finally {
    await client.end();
  }
}

run();
