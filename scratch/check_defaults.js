const db = require('../adms-sync/db');
async function run() {
  const q = await db.query(`
    SELECT column_name, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name='customers'
  `);
  console.log(q.rows);
  process.exit(0);
}
run();
