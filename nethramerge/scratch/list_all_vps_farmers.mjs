import pg from 'pg';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function checkData() {
  const client = new Client({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || '195.35.22.13',
    database: process.env.PG_DATABASE || 'shastika_erp',
    password: process.env.PG_PASSWORD || 'Shastika2026',
    port: parseInt(process.env.PG_PORT || '5432', 10),
  });

  try {
    await client.connect();
    console.log("Connected to PG database successfully!");

    const listRes = await client.query('SELECT id, full_name, email, is_deleted FROM farmers');
    console.log("All farmers in VPS:");
    listRes.rows.forEach((f, idx) => console.log(`${idx + 1}. ID: ${f.id} | Name: ${f.full_name} | Email: ${f.email} | Deleted: ${f.is_deleted}`));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

checkData();
