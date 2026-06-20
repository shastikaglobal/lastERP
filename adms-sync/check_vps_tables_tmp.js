const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: '195.35.22.13',
  database: 'shastika_erp',
  password: 'Shastika2026',
  port: 5432,
});

async function checkTables() {
  try {
    await client.connect();
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`Found ${result.rows.length} tables in public schema:\n`);
    result.rows.forEach(row => console.log('  ' + row.table_name));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkTables();
