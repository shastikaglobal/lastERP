const db = require('./db');

async function run() {
  try {
    const { rows } = await db.query('SELECT * FROM "AttLogs" ORDER BY "LogDateTime" DESC LIMIT 10');
    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
