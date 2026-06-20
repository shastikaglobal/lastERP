const db = require('./adms-sync/db.js');

async function run() {
  try {
    const empId = 'f3c638cf-b8b4-41ea-92a7-bf3acbeb819d';
    const date = '2026-06-12';
    
    console.log("Running test UPDATE...");
    const res = await db.query(
      'UPDATE attendance_logs SET status = $1, is_manual = true, is_deleted = false, deleted_at = null, deleted_by = null WHERE employee_id = $2 AND date = $3',
      ['on_leave', empId, date]
    );
    console.log("UPDATE result:", res.rowCount);
  } catch (err) {
    console.error("UPDATE failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
