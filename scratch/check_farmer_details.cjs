const db = require('../adms-sync/db');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const id = '5aafa79f-9292-4b12-aff0-12a9c66484bf';
  
  // VPS DB
  const { rows: vpsRows } = await db.query('SELECT * FROM farmers WHERE id = $1', [id]);
  console.log("VPS Farmer:", vpsRows[0]);

  // Supabase
  const { data: sbFarmer, error } = await supabase.from('farmers').select('*').eq('id', id).single();
  if (error) console.error("Supabase Error:", error);
  else console.log("Supabase Farmer:", sbFarmer);

  process.exit(0);
}
run();
