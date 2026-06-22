const db = require('../adms-sync/db');
const { createClient } = require('@supabase/supabase-js');

// load env
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const farmerId = '5aafa79f-9292-4b12-aff0-12a9c66484bf'; // Jothiprakash
  const company_id = '00000000-0000-0000-0000-00000000ae01';
  const name = 'Jothiprakash';
  const email = '';
  const country = '';
  const phone = '8122207579';
  const notes = '';

  try {
    console.log("Starting test...");
    let { rows: farmerRows } = await db.query(
      `SELECT id, company_id, full_name, email, phone, country, notes, is_deleted FROM farmers WHERE id = $1`,
      [farmerId]
    );
    console.log("Farmer rows count:", farmerRows.length);
    if (farmerRows.length === 0) {
      console.log("Farmer not found locally");
      return;
    }
    const farmer = farmerRows[0];
    const customerEmail = (email || farmer.email || '').trim();

    // Check duplicate customer by farmer_id (most reliable) or email
    const { rows: existingByFarmer } = await db.query(
      `SELECT id FROM customers WHERE company_id = $1 AND farmer_id = $2 LIMIT 1`,
      [company_id, farmerId]
    );
    console.log("Existing by farmer:", existingByFarmer);

    // Insert customer in local VPS database
    console.log("Inserting customer in local VPS DB...");
    const { rows: insertedRows } = await db.query(
      `INSERT INTO customers (company_id, name, email, country, phone, notes, farmer_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        company_id,
        name || farmer.full_name,
        customerEmail || null,
        country || farmer.country || null,
        phone || farmer.phone || null,
        notes || farmer.notes || null,
        farmerId,
      ]
    );
    console.log("Inserted rows:", insertedRows);
  } catch (err) {
    console.error("ERROR DETECTED:", err);
  }
  process.exit(0);
}

test();
