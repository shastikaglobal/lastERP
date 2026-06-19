const db = require('./db');
async function run() {
  const { rows } = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(rows.map(x => x.table_name).sort());
  process.exit(0);
}
run();
