const db = require('../db');
(async () => {
  try {
    const companyId = '00000000-0000-0000-0000-00000000ae01';
    const q = `SELECT l.id, l.company_id, l.company_name, l.stage FROM leads l WHERE l.company_id = $1 AND l.is_deleted IS NOT TRUE AND (l.stage ILIKE '%client%' OR l.stage ILIKE '%convert%' OR l.stage ILIKE '%won%') ORDER BY l.created_at DESC LIMIT 20`;
    const res = await db.query(q, [companyId]);
    console.log('matches for company:', res.rows.length);
    console.table(res.rows);
  } catch (err) {
    console.error('error', err);
  }
  process.exit();
})();
