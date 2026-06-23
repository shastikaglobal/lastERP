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

async function checkLeads() {
  console.log('=== Checking Supabase Leads ===');
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: sbLeads, error: sbErr } = await supabase.from('leads').select('count');
  if (sbErr) {
    console.error('Supabase Error:', sbErr.message);
  } else {
    console.log('Supabase Leads count:', sbLeads);
  }

  console.log('\n=== Checking VPS Database Leads ===');
  const pool = new pg.Pool({
    user: env.PG_USER,
    host: env.PG_HOST,
    database: env.PG_DATABASE,
    password: env.PG_PASSWORD,
    port: parseInt(env.PG_PORT || '5432', 10),
  });

  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM leads');
    console.log('VPS Leads count:', rows[0].count);
    
    const { rows: sample } = await pool.query('SELECT id, company_name, contact_name, stage FROM leads LIMIT 3');
    console.log('Sample VPS Leads:', sample);
  } catch (err) {
    console.error('VPS DB Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkLeads().catch(console.error);
