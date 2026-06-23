const db = require('../adms-sync/db');
async function run() {
  const queryText = `
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'farmer_id';
  `;
  try {
    const q = await db.query(queryText);
    console.log("QUERY_RESULTS:", q.rows);
  } catch (err) {
    console.error("Query Error:", err);
  }
  process.exit(0);
}
run();
