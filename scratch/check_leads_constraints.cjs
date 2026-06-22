const db = require('../adms-sync/db');
async function run() {
  const q = await db.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'leads'::regclass
  `);
  console.log("LEADS CONSTRAINTS:", q.rows);
  process.exit(0);
}
run();
