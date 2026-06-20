const db = require('./adms-sync/db.js');

async function run() {
  try {
    // Let's get one employee_id from profiles
    const { rows: profiles } = await db.query('SELECT id FROM profiles LIMIT 1');
    if (profiles.length === 0) {
      console.log("No profiles found.");
      return;
    }
    const empId = profiles[0].id;
    console.log("Using employee ID:", empId);

    // Let's run a test query
    await db.query('BEGIN');
    const res = await db.query(
      `INSERT INTO attendance_logs (employee_id, date, status) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (employee_id, date) 
       DO UPDATE SET status = EXCLUDED.status`,
      [empId, '2026-06-12', 'on_leave']
    );
    console.log("Successfully inserted/updated on_leave!");
    await db.query('ROLLBACK');
  } catch (err) {
    console.error("Test Query Failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
