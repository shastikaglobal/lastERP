const db = require('./db');
const fs = require('fs');

async function run() {
  try {
    const sql = fs.readFileSync('migrate_inventory.sql', 'utf8');
    await db.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
