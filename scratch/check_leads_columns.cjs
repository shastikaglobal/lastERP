const db = require('../adms-sync/db');
async function run() {
  const q = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name='leads'
  `);
  console.log(q.rows.map(r => r.column_name).sort());
  process.exit(0);
}
run();
