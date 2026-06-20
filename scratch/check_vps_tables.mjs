import pg from 'pg';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function checkTables() {
  const client = new Client({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || '195.35.22.13',
    database: process.env.PG_DATABASE || 'shastika_erp',
    password: process.env.PG_PASSWORD || 'Shastika2026',
    port: parseInt(process.env.PG_PORT || '5432', 10),
  });

  try {
    await client.connect();
    console.log("Connected to local/VPS Postgres!");

    const q = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const { rows } = await client.query(q);
    console.log("Tables in VPS Postgres:");
    rows.forEach(r => console.log(`- ${r.table_name}`));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

checkTables();
