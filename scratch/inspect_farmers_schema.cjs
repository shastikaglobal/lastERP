const db = require('../adms-sync/db');

async function test() {
  try {
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'farmers'
      ORDER BY ordinal_position;
    `;
    const { rows } = await db.query(query);
    console.log("FARMERS COLUMNS:", rows);

    process.exit(0);
  } catch (e) {
    console.error("ERROR:", e);
    process.exit(1);
  }
}

test();
