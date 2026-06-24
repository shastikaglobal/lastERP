const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || '195.35.22.13',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD || 'Shastika2026',
  port: parseInt(process.env.PG_PORT || '5432', 10),
});

async function checkQuery() {
  const company_id = '00000000-0000-0000-0000-00000000ae01';
  console.log(`Executing farmers query for company: ${company_id}`);
  
  try {
    const query = `
      SELECT f.*, 
             CASE WHEN c.id IS NOT NULL THEN 'converted' ELSE 'active' END as conversion_status
      FROM farmers f
      LEFT JOIN customers c ON c.farmer_id = f.id
      WHERE f.company_id = $1 AND f.is_deleted IS NOT TRUE
      ORDER BY f.created_at DESC
    `;
    const { rows } = await pool.query(query, [company_id]);
    console.log(`Query returned ${rows.length} rows:`);
    console.log(rows.map(r => ({ id: r.id, name: r.full_name, is_deleted: r.is_deleted, status: r.conversion_status })));
  } catch (err) {
    console.error('Database query error:', err.message);
  } finally {
    await pool.end();
  }
}

checkQuery();
