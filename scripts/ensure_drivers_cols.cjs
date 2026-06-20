const db = require('../adms-sync/db.js');

(async () => {
  try {
    await db.query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_name text");
    console.log('added driver_name');
    await db.query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number text");
    console.log('ensured license_number');
    await db.query("UPDATE drivers SET driver_name = name WHERE driver_name IS NULL AND name IS NOT NULL");
    console.log('migrated name -> driver_name');
    // Make legacy 'name' column nullable and keep it in sync (best-effort)
    try {
      await db.query("ALTER TABLE drivers ALTER COLUMN name DROP NOT NULL");
      console.log('made legacy name column nullable');
      await db.query("UPDATE drivers SET name = driver_name WHERE name IS NULL AND driver_name IS NOT NULL");
      console.log('copied driver_name -> name for nulls');
    } catch (e) {
      console.warn('could not alter legacy name column:', e.message || e)
    }
  } catch (e) {
    console.error('error:', e.message || e)
    process.exit(1)
  }
})();
