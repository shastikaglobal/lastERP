import { Pool } from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const env = dotenv.parse(readFileSync('.env'));
const pool = new Pool({
  user: env.PG_USER || 'erp_admin',
  host: env.PG_HOST || '127.0.0.1',
  database: env.PG_DATABASE || 'shastika_erp',
  password: env.PG_PASSWORD,
  port: parseInt(env.PG_PORT || '5432', 10),
});

async function checkVPS() {
  try {
    const { rows: zoho } = await pool.query('SELECT * FROM zoho_accounts');
    console.log("VPS zoho_accounts count:", zoho.length);

    const { rows: emails } = await pool.query('SELECT COUNT(*) FROM emails');
    console.log("VPS emails count:", emails[0].count);
  } catch (e) {
    console.error("VPS error:", e);
  } finally {
    pool.end();
  }
}

checkVPS();
