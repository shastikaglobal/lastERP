const db = require('./adms-sync/db.js');

async function run() {
  try {
    const { rows } = await db.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance_logs';
    `);
    console.log("Columns of attendance_logs:");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
