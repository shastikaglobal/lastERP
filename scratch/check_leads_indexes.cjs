const db = require('../adms-sync/db');
async function run() {
  const q = await db.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'leads'
  `);
  console.log("LEADS INDEXES:", q.rows);
  process.exit(0);
}
run();
