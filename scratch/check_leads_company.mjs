import dns from 'dns';
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')]; })
);

async function main() {
  const pool = new pg.Pool({
    user: env.PG_USER,
    host: env.PG_HOST,
    database: env.PG_DATABASE,
    password: env.PG_PASSWORD,
    port: parseInt(env.PG_PORT || '5432', 10),
  });

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('=== VPS Leads Company IDs ===');
    const { rows: leadCompanies } = await pool.query(
      'SELECT DISTINCT company_id, COUNT(*) FROM leads GROUP BY company_id'
    );
    console.log(leadCompanies);

    console.log('\n=== Supabase Profiles & Company IDs ===');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_id');
    
    if (error) {
      console.error(error.message);
    } else {
      console.log(profiles);
    }

  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
