const db = require('../db');
(async () => {
  try {
    const q = `SELECT id, company_id, company_name, stage, created_at, updated_at FROM leads WHERE stage ILIKE '%client%' OR stage ILIKE '%acquir%' OR stage ILIKE '%acquired%' ORDER BY updated_at DESC NULLS LAST LIMIT 50`;
    const res = await db.query(q);
    console.log('matches:', res.rows.length);
    console.table(res.rows);
  } catch (err) {
    console.error('error', err);
  }
  process.exit();
})();
