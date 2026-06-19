const db = require('./adms-sync/db.js');

async function run() {
  try {
    const { rows } = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log("Tables in VPS database:");
    console.log(rows.map(r => r.table_name).sort());
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
