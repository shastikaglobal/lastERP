const db = require('../adms-sync/db.js');

(async () => {
  try {
    await db.query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_name text");
    console.log('added driver_name');
    await db.query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number text");
    console.log('ensured license_number');
    await db.query("UPDATE drivers SET driver_name = name WHERE driver_name IS NULL AND name IS NOT NULL");
    console.log('migrated name -> driver_name');
  } catch (e) {
    console.error('error:', e.message || e)
    process.exit(1)
  }
})();
