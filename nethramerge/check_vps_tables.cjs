require('dotenv').config();
const {Pool} = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST,
  user: 'postgres',
  password: process.env.PG_PASSWORD,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Check which tables exist
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema='public' 
       AND table_name IN ('vehicles','drivers','shipment_dispatches') 
       ORDER BY table_name`
    );
    console.log('Tables on VPS:', res.rows.map(r => r.table_name));

    // Also check all public tables
    const all = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    );
    console.log('\nAll public tables on VPS:');
    all.rows.forEach(r => console.log(' -', r.table_name));

    // Reload PostgREST schema cache
    try {
      await pool.query("NOTIFY pgrst, 'reload schema'");
      console.log('\n✅ PostgREST schema cache reload notified');
    } catch(e) {
      console.log('NOTIFY result:', e.message);
    }
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
