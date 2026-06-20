const db = require('./adms-sync/db.js');

async function run() {
  try {
    const res = await db.query(`
      SELECT pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      WHERE proname = 'fn_attlog_to_attendance';
    `);
    console.log(res.rows[0].def);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
