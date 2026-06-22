import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function testQuery() {
  const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: parseInt(process.env.PG_PORT || '5432'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Testing query on customers table in VPS...');
    const companyId = '00000000-0000-0000-0000-00000000ae01';
    const { rows } = await pool.query(
      'SELECT * FROM customers WHERE company_id = $1 AND is_deleted IS NOT TRUE ORDER BY name',
      [companyId]
    );
    console.log(`Success! Found ${rows.length} customers.`);
    console.log(rows.slice(0, 2));
  } catch (err) {
    console.error('Database query failed:', err.message || err);
    if (err.stack) console.error(err.stack);
  } finally {
    await pool.end();
  }
}

testQuery();
