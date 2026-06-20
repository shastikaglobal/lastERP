const db = require('../adms-sync/db');
const today = '2026-06-20';

db.query("SELECT id FROM profiles WHERE full_name ILIKE '%swathi%' LIMIT 1")
  .then(res => {
    if (res.rows.length === 0) {
      console.log('Swathi not found');
      return process.exit(0);
    }
    const empId = res.rows[0].id;
    return db.query('UPDATE attendance_logs SET clock_out = NULL WHERE employee_id = $1 AND date = $2', [empId, today])
      .then(() => {
        console.log('Punch out removed for Swathi');
        process.exit(0);
      });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
