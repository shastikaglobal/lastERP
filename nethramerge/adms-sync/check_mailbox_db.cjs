const db = require('./db');

async function run() {
  try {
    const res1 = await db.query('SELECT count(*) FROM zoho_accounts');
    console.log('zoho_accounts count:', res1.rows[0].count);

    const res2 = await db.query('SELECT count(*) FROM emails');
    console.log('emails count:', res2.rows[0].count);
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
