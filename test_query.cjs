const db = require('./adms-sync/db');

async function test() {
  try {
    const { rows: farmers } = await db.query('SELECT * FROM farmers LIMIT 1');
    console.log("FARMERS:", farmers);
    
    // Check customers table as well
    const { rows: customersCols } = await db.query("SELECT cd.column_name FROM information_schema.columns cd WHERE cd.table_name = 'customers'");
    console.log("CUSTOMERS COLS:", customersCols);

    process.exit(0);
  } catch (e) {
    console.error("ERROR:", e);
    process.exit(1);
  }
}

test();
