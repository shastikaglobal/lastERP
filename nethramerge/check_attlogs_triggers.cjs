const db = require('./adms-sync/db.js');

async function run() {
  try {
    const { rows } = await db.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'AttLogs';
    `);
    console.log("Triggers on AttLogs:");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
