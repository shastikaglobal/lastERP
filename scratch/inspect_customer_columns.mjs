import pg from 'pg';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function executeSql() {
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

    const sql = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers';
    `;

    const res = await client.query(sql);
    console.log("Columns of customers table:");
    console.log(res.rows);
  } catch (err) {
    console.error("Error executing SQL:", err.message);
  } finally {
    await client.end();
  }
}

executeSql();
