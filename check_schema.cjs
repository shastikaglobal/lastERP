const db = require('./adms-sync/db.js');

async function checkSchema() {
  try {
    const res = await db.query(`
      SELECT column_name, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_default LIKE '%auth%';
    `);
    console.log("Defaults:", res.rows);

    const res2 = await db.query(`
      SELECT pg_get_triggerdef(t.oid) as trigger_def
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'leads';
    `);
    console.log("Triggers:", res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
checkSchema();
