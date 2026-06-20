const db = require('./db');
async function run() {
  const q = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='customers'`);
  console.log(q.rows);
  process.exit(0);
}
run();
