import pg from 'pg';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

const DB_CONFIG = {
  user:     process.env.PG_USER     || 'postgres',
  host:     process.env.PG_HOST     || '195.35.22.13',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD || 'Shastika2026',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  connectionTimeoutMillis: 8000,
};

async function run() {
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log("🚛 Drivers in VPS DB:");
    const { rows: drivers } = await client.query("SELECT id, driver_name, license_number FROM drivers");
    drivers.forEach(d => console.log(`  - ${d.driver_name} | License: ${d.license_number}`));

    console.log("\n🚗 Vehicles in VPS DB:");
    const { rows: vehicles } = await client.query("SELECT id, vehicle_number, vehicle_type FROM vehicles");
    vehicles.forEach(v => console.log(`  - ${v.vehicle_number} | Type: ${v.vehicle_type}`));
  } catch (err) {
    console.error("Error querying VPS:", err.message);
  } finally {
    await client.end();
  }
}

run();
