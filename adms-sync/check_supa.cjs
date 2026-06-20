require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const t1 = await supabase.from('receiving_goods').select('id').limit(1);
  console.log('receiving_goods in Supabase:', t1.error ? t1.error.message : 'EXISTS');
  
  const t2 = await supabase.from('warehouse_locations').select('id').limit(1);
  console.log('warehouse_locations in Supabase:', t2.error ? t2.error.message : 'EXISTS');
}
check();
