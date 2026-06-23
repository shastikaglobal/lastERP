import pg from 'pg';
const { Client } = pg;

async function testConnection() {
  const client = new Client({
    host: 'db.sxebygxpjzntogzpjnga.supabase.co',
    port: 5432,
    user: 'postgres',
    database: 'postgres',
    password: 'Shastika2026',
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PG database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT version();');
    console.log('Version:', res.rows[0].version);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
