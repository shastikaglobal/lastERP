const db = require('./db');
async function run() {
  const { rows } = await db.query('SELECT * FROM face_attendance');
  console.log("face_attendance rows:", rows);
}
run();
