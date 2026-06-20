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

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates_of_origin (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        ref_number VARCHAR(255),
        consignee_name VARCHAR(255),
        consignee_address TEXT,
        vessel VARCHAR(255),
        port_of_loading VARCHAR(255),
        port_of_discharge VARCHAR(255),
        marks_and_nos TEXT,
        product_name VARCHAR(255),
        packing_details TEXT,
        hs_code VARCHAR(100),
        quantity VARCHAR(100),
        unit VARCHAR(50),
        gross_weight VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID,
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `);
    console.log("Table certificates_of_origin created successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    pool.end();
  }
}

run();
