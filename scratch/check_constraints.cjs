const db = require('../adms-sync/db');
async function run() {
  const q = await db.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'customers'::regclass
  `);
  console.log("CONSTRAINTS:", q.rows);

  const indexes = await db.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'customers'
  `);
  console.log("INDEXES:", indexes.rows);

  process.exit(0);
}
run();
