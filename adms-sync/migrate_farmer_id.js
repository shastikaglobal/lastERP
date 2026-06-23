// One-time migration: add farmer_id to customers table on VPS and Supabase
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || '195.35.22.13',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  connectionTimeoutMillis: 10000,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // 1. VPS migration
  console.log('--- VPS Migration ---');
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS farmer_id UUID`);
    console.log('✅ Added farmer_id column to VPS customers table');
    await pool.query(`ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_farmer_id_fkey`);
    await pool.query(`ALTER TABLE customers ADD CONSTRAINT customers_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE SET NULL`);
    console.log('✅ Added foreign key constraint (farmer_id references farmers(id))');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_customers_farmer_id ON customers (farmer_id)`);
    console.log('✅ Created index on farmer_id');
  } catch (err) {
    console.error('❌ VPS migration failed:', err.message);
  } finally {
    await pool.end();
  }

  // 2. Supabase migration via RPC (raw SQL)
  console.log('\n--- Supabase Migration ---');
  let error;
  try {
    const res = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL; CREATE INDEX IF NOT EXISTS idx_customers_farmer_id ON public.customers (farmer_id);`
    });
    error = res.error;
  } catch (err) {
    error = { message: err.message || 'exec_sql RPC not available' };
  }

  if (error) {
    console.warn('⚠️  exec_sql RPC not available or failed:', error.message);
    console.log('👉 Please run this SQL manually in the Supabase SQL Editor:');
    console.log(`
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_farmer_id ON public.customers (farmer_id);
    `);
  } else {
    console.log('✅ Supabase migration applied');
  }
}

run();
