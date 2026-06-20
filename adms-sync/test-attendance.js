const db = require('./db');
async function run() {
  const { rows } = await db.query('SELECT * FROM attendance_logs');
  console.log("attendance_logs rows:", rows);
}
run();
