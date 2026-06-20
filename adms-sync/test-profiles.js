const db = require('./db');
async function run() {
  const { rows } = await db.query('SELECT id, full_name, biometric_id FROM profiles');
  console.log("Profiles in VPS DB:", rows);
}
run();
