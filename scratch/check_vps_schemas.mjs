import pg from 'pg';
import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new pg.Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432'),
  connectionTimeoutMillis: 8000,
});

const tables = [
  'face_attendance', 'bills_of_lading', 'packing_lists',
  'journal_entries', 'warehouse_stock', 'emails',
  'zoho_accounts', 'meetings', 'farms', 'suppliers', 'sales_orders'
];

console.log('=== Current VPS Schema for Target Tables ===\n');

for (const table of tables) {
  const { rows } = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [table]);

  if (rows.length === 0) {
    console.log(`❌ ${table} — does NOT exist`);
  } else {
    console.log(`✅ ${table} (${rows.length} columns):`);
    rows.forEach(r => {
      console.log(`   ${r.column_name.padEnd(25)} ${r.data_type}`);
    });
  }
  console.log();
}

await pool.end();
