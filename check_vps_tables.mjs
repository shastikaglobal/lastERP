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

async function check() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log(rows.map(r => r.table_name));
    
    // specifically check packing_protocols
    const { rows: data } = await pool.query(`SELECT * FROM packing_protocols`);
    console.log("packing_protocols data:", data);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
