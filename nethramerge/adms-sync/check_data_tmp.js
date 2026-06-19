const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: '195.35.22.13',
  database: 'shastika_erp',
  password: 'Shastika2026',
  port: 5432,
});

async function checkData() {
  try {
    await client.connect();
    const result = await client.query(`SELECT * FROM inventory_batches LIMIT 10`);
    console.log(result.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkData();
