const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, company_id, role');
    
  if (error) {
    console.error(error);
  } else {
    console.log('PROFILES:', JSON.stringify(profiles, null, 2));
  }
}
run();
