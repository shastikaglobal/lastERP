import fs from 'fs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config();

function getDatabaseUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.PG_HOST;
  if (!host) return null;
  const user = process.env.PG_USER || process.env.PGUSER || 'postgres';
  const password = process.env.PG_PASSWORD || process.env.PGPASSWORD || '';
  const database = process.env.PG_DATABASE || process.env.PG_DB || process.env.PGDATABASE || 'postgres';
  const port = process.env.PG_PORT || '5432';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const dbUrl = getDatabaseUrl();
if (!dbUrl) {
  console.error('No DB URL found in environment. Set SUPABASE_DB_URL or DATABASE_URL or PG_HOST/PG_*');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    const sql = fs.readFileSync('supabase/migrations/20260612150000_create_dispatch_tables.sql', 'utf8');
    console.log('Applying dispatch migration...');
    await pool.query(sql);
    console.log('Migration applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end().catch(()=>{});
  }
})();
