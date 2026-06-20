import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  user: process.env.PG_USER || 'erp_admin',
  host: process.env.PG_HOST || '127.0.0.1',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432', 10),
});

async function main() {
  const res = await pool.query("SELECT * FROM companies WHERE id = '00000000-0000-0000-0000-00000000ae01'");
  console.log("Company details:", res.rows);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
});
