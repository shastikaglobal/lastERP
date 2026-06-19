import db from './db.js';

async function createTables() {
  try {
    const createDrivers = `CREATE TABLE IF NOT EXISTS drivers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_name text NOT NULL,
      license_number text,
      is_active boolean DEFAULT true,
      is_deleted boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    )`;
    await db.query(createDrivers);
    console.log('✅ Created drivers table');

    const createVehicles = `CREATE TABLE IF NOT EXISTS vehicles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vehicle_number text NOT NULL,
      vehicle_type text,
      is_active boolean DEFAULT true,
      is_deleted boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    )`;
    await db.query(createVehicles);
    console.log('✅ Created vehicles table');
    
    // Also add is_deleted if table existed before but didn't have it
    try {
        await db.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;`);
        await db.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;`);
    } catch (e) {}
    
    // Ensure driver_name is used over name if it was old schema
    try {
        await db.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_name text;`);
        await db.query(`UPDATE drivers SET driver_name = name WHERE driver_name IS NULL AND (SELECT to_regclass('public.drivers') IS NOT NULL);`);
    } catch (e) {}

  } catch (err) {
    console.error('❌ Error creating tables:', err);
  } finally {
    process.exit(0);
  }
}

createTables();
