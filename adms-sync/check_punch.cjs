const { createClient } = require('@supabase/supabase-js');
const db = require('./db');
require('dotenv').config({ path: '../.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    // 1. Get profile IDs for Nethra
    const { data: profilesN, error: errN } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('full_name', '%Nethra%');
      
    const employees = [...(profilesN || [])];
    console.log('Employees found:', employees);

    if (employees.length === 0) {
      console.log('No employees found with those names.');
      process.exit(0);
    }

    const ids = employees.map(e => e.id);

    // 2. Query attendance_logs for these employees where clock_out is null
    const query = `
      SELECT id, employee_id, date::text as date, clock_in, clock_out, status 
      FROM attendance_logs 
      WHERE employee_id = ANY($1)
      ORDER BY date DESC
    `;
    const { rows } = await db.query(query, [ids]);
    
    console.log('Attendance records:', rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

check();
