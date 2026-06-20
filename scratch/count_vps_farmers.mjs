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

    const farmersRes = await client.query('SELECT count(*), count(*) filter (where is_deleted) as deleted_count FROM farmers');
    console.log("Farmers count in VPS:", farmersRes.rows[0]);

    const customersRes = await client.query('SELECT count(*) FROM customers');
    console.log("Customers count in VPS:", customersRes.rows[0]);
    
    // Print the first few farmers to see if their IDs match
    const listRes = await client.query('SELECT id, full_name, email FROM farmers LIMIT 5');
    console.log("First 5 farmers in VPS:");
    listRes.rows.forEach(f => console.log(`- ID: ${f.id} | Name: ${f.full_name} | Email: ${f.email}`));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

checkData();
