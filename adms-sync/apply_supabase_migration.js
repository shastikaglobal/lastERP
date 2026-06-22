// Apply farmer_id migration to Supabase via Management API
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const projectRef = 'sxebygxpjzntogzpjnga';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;

const sql = [
  'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL',
  'CREATE INDEX IF NOT EXISTS idx_customers_farmer_id ON public.customers (farmer_id)'
].join('; ');

async function run() {
  console.log('Applying Supabase migration...');
  console.log('Project:', projectRef);
  console.log('SQL:', sql);

  // Try Supabase Management API
  const resp = await fetch(
    'https://api.supabase.com/v1/projects/' + projectRef + '/database/query',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + serviceRoleKey
      },
      body: JSON.stringify({ query: sql })
    }
  );

  const body = await resp.text();
  console.log('Management API Status:', resp.status);
  console.log('Response:', body.substring(0, 500));

  if (resp.status === 401 || resp.status === 403) {
    console.log('\n⚠️  Management API requires a personal access token (not service role key).');
    console.log('👉 Please run this SQL manually in the Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
    console.log(sql + ';');
  } else if (resp.ok) {
    console.log('\n✅ Supabase migration applied successfully!');
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  console.log('\n👉 Please run this SQL manually in the Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
  console.log(sql + ';');
});
