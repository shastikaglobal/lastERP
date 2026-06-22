const db = require('../adms-sync/db');
async function run() {
  const q = await db.query(`SELECT * FROM customers WHERE farmer_id = '5aafa79f-9292-4b12-aff0-12a9c66484bf'`);
  console.log("CUSTOMERS_WITH_FARMER_ID:", q.rows);
  process.exit(0);
}
run();
