const db = require('../adms-sync/db');

async function test() {
  try {
    const query = `
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('farmers', 'customers') 
      AND column_name IN ('farmer_id', 'status', 'converted_at')
      ORDER BY table_name, column_name;
    `;
    const { rows } = await db.query(query);
    console.log("COLUMNS:", rows);

    process.exit(0);
  } catch (e) {
    console.error("ERROR:", e);
    process.exit(1);
  }
}

test();
