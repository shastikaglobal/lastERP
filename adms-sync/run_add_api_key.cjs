const db = require('./db');
async function run() {
  try {
    await db.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS api_key TEXT;`);
    console.log('Migration successful');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
