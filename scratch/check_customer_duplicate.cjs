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
  const company_id = '00000000-0000-0000-0000-00000000ae01';
  const email = 'karunyajothiprakash811@gmail.com';

  const { rows: vpsRows } = await db.query(
    'SELECT * FROM customers WHERE company_id = $1 AND email = $2',
    [company_id, email]
  );
  console.log("VPS customers with this email:", vpsRows);

  const { data: sbCustomers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', company_id)
    .eq('email', email);
  
  if (error) console.error("Supabase error:", error);
  else console.log("Supabase customers with this email:", sbCustomers);

  process.exit(0);
}
run();
