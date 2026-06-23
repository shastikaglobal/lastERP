const db = require('../adms-sync/db');

async function test() {
  try {
    const { rows: farmers } = await db.query("SELECT id, full_name FROM farmers LIMIT 50");
    console.log("ALL FARMERS IN DB:", farmers);

    const { rows: customers } = await db.query("SELECT id, name, farmer_id FROM customers LIMIT 50");
    console.log("ALL CUSTOMERS IN DB:", customers);

    process.exit(0);
  } catch (e) {
    console.error("ERROR:", e);
    process.exit(1);
  }
}

test();
