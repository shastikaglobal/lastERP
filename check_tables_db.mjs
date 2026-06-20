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

(async () => {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    console.error('No DB URL');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    for (const t of ['vehicles','drivers']) {
      const { rows: exists } = await pool.query(`SELECT to_regclass($1) AS exists`, [t]);
      console.log(t, 'exists:', exists[0].exists);
      if (exists[0].exists) {
        const { rows: cols } = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [t]);
        console.log('columns for', t, cols);
      }
    }
  } catch (err) {
    console.error('check failed', err.message || err);
  } finally {
    await pool.end();
  }
})();
