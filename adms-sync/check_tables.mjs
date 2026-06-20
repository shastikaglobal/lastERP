import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      user: process.env.PG_USER || 'erp_admin',
      host: process.env.PG_HOST || '127.0.0.1',
      database: process.env.PG_DATABASE || 'shastika_erp',
      password: process.env.PG_PASSWORD,
      port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
    };

const pool = new pg.Pool(poolConfig);

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in public schema:");
    console.log(res.rows.map(r => r.table_name).join(', '));
    
    // Test profiles table
    const prof = await pool.query('SELECT * FROM profiles LIMIT 1');
    console.log('Profiles columns:', prof.fields.map(f => f.name).join(', '));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
