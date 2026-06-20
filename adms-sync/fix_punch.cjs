const db = require('./db');

async function fix() {
  try {
    const ids = ['da0c65cb-3c9d-4759-a83e-733869bbf06e', '2e49e2be-ffd5-4c0b-a317-ce880e38f694'];
    
    for (const id of ids) {
      await db.query('UPDATE attendance_logs SET clock_out = NULL WHERE id = $1', [id]);
      console.log(`Cleared clock_out for log ${id}`);
    }
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    process.exit(0);
  }
}

fix();
