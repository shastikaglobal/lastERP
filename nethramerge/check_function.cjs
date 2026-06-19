const db = require('./adms-sync/db.js');

async function checkFunc() {
  try {
    const res = await db.query(`
      SELECT pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      WHERE proname = 'log_activity';
    `);
    console.log(res.rows[0].def);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
checkFunc();
