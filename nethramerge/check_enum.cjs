const db = require('./adms-sync/db.js');

async function run() {
  try {
    const { rows } = await db.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'attendance_status'::regtype;
    `);
    console.log("Enum values for attendance_status:");
    console.log(rows.map(r => r.enumlabel));
  } catch (err) {
    console.error("Error querying enum:", err);
  } finally {
    process.exit(0);
  }
}

run();
