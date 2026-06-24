const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || '195.35.22.13',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD || 'Shastika2026',
  port: parseInt(process.env.PG_PORT || '5432', 10),
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log('--- DATABASE DIAGNOSIS ---');
  
  try {
    // 1. Fetch Karunya profile
    console.log('\n1. Fetching Karunya profile from Supabase...');
    const { data: karunyaProfile, error: kpErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_id, role')
      .ilike('full_name', '%karunya%')
      .maybeSingle();
      
    if (kpErr) {
      console.error('Error fetching Karunya profile:', kpErr.message);
    } else {
      console.log('Karunya Profile:', karunyaProfile);
    }

    // 2. Fetch all profiles to see companies
    console.log('\n2. Fetching all distinct companies in profiles (Supabase)...');
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('company_id, full_name, email, role');
    
    if (profErr) {
       console.error('Error fetching profiles:', profErr.message);
    } else {
       const companies = [...new Set(profiles.map(p => p.company_id))];
       console.log('Unique company_ids in profiles:', companies);
       console.log('Profiles list:', profiles.map(p => ({ name: p.full_name, email: p.email, company_id: p.company_id })));
    }

    const targetCompanyId = karunyaProfile ? karunyaProfile.company_id : null;
    
    // 3. Query Supabase farmers
    console.log('\n3. Querying farmers table in Supabase...');
    const { data: sbFarmers, error: sfErr } = await supabase
      .from('farmers')
      .select('*');
      
    if (sfErr) {
      console.error('Error fetching farmers from Supabase:', sfErr.message);
    } else {
      console.log(`Found ${sbFarmers.length} farmers in Supabase:`);
      console.log(sbFarmers.map(f => ({ id: f.id, name: f.full_name, company_id: f.company_id, is_deleted: f.is_deleted })));
    }

    // 4. Query VPS PostgreSQL farmers
    console.log('\n4. Querying farmers table in VPS PostgreSQL DB...');
    const { rows: localFarmers } = await pool.query('SELECT id, full_name, company_id, is_deleted FROM farmers');
    console.log(`Found ${localFarmers.length} farmers in VPS database:`);
    console.log(localFarmers);

    // 5. Query customers in VPS PostgreSQL
    console.log('\n5. Querying customers table in VPS PostgreSQL DB...');
    const { rows: localCustomers } = await pool.query('SELECT id, name, company_id, farmer_id FROM customers');
    console.log(`Found ${localCustomers.length} customers in VPS database:`);
    console.log(localCustomers);

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    await pool.end();
  }
}

diagnose();
