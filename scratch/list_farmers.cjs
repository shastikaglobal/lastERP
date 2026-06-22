const db = require('../adms-sync/db');
async function run() {
  const q = await db.query(`SELECT id, full_name, is_deleted, is_active FROM farmers LIMIT 5`);
  console.log(q.rows);
  process.exit(0);
}
run();
