import pg from 'pg';
import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new pg.Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432'),
  connectionTimeoutMillis: 8000,
});

// 1. Check if follow_ups exists and show schema
const { rows: cols } = await pool.query(`
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns 
  WHERE table_schema='public' AND table_name='follow_ups' 
  ORDER BY ordinal_position
`);

if (cols.length === 0) {
  console.log('❌ follow_ups table does NOT exist in VPS!');
} else {
  console.log(`✅ follow_ups table EXISTS — ${cols.length} columns:\n`);
  console.log('COLUMN                     TYPE                    DEFAULT');
  console.log('─────────────────────────────────────────────────────────────');
  cols.forEach(c => {
    console.log(
      c.column_name.padEnd(27) +
      c.data_type.padEnd(24) +
      (c.column_default || '(none)')
    );
  });
}

// 2. Show last 5 follow_up records with reminder_time
console.log('\n\n=== Last 5 Follow-Up Records ===');
const { rows: records } = await pool.query(`
  SELECT id, lead_id, reminder_time, follow_up_date, note, created_at
  FROM follow_ups
  ORDER BY created_at DESC
  LIMIT 5
`);
if (records.length === 0) {
  console.log('(no records)');
} else {
  records.forEach(r => {
    console.log(`  ID: ${r.id}`);
    console.log(`  reminder_time: ${r.reminder_time}`);
    console.log(`  follow_up_date: ${r.follow_up_date}`);
    console.log(`  note: ${r.note}`);
    console.log('');
  });
}

await pool.end();
