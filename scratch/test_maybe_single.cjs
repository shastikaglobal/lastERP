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

  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .eq('company_id', company_id)
    .eq('email', email)
    .maybeSingle();

  console.log("DATA:", data);
  console.log("ERROR:", error);
  process.exit(0);
}
run();
