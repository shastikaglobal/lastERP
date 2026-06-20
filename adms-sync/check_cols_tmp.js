const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: '195.35.22.13',
  database: 'shastika_erp',
  password: 'Shastika2026',
  port: 5432,
});

async function checkCols() {
  try {
    await client.connect();
    const result = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'available_stock'
    `);
    
    console.log(result.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkCols();
