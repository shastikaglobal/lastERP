import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sql = `
  DROP POLICY IF EXISTS "profiles_bde_select" ON profiles;

  CREATE POLICY "profiles_bde_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (role ILIKE 'bde' AND company_id = current_company_id());
`;

async function main() {
  console.log('Applying profiles_bde_select RLS policy...');

  // Use the Supabase SQL endpoint (PostgREST pg_query)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({})
  });

  // The REST API can't run DDL. Fall back to the SQL API endpoint.
  // Supabase exposes a /pg endpoint for service-role SQL execution.
  const sqlRes = await fetch(`${SUPABASE_URL}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (sqlRes.ok) {
    const result = await sqlRes.json();
    console.log('✅ RLS policy "profiles_bde_select" applied successfully!');
    console.log(result);
  } else {
    const errText = await sqlRes.text();
    console.log(`❌ SQL endpoint failed (${sqlRes.status}). Trying alternative...`);
    console.log(errText);

    // Alternative: use the /pg/query endpoint (available on some Supabase versions)
    const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (pgRes.ok) {
      const pgResult = await pgRes.json();
      console.log('✅ RLS policy applied via /pg/query!');
      console.log(pgResult);
    } else {
      const pgErr = await pgRes.text();
      console.log(`❌ /pg/query also failed (${pgRes.status}).`);
      console.log(pgErr);
      console.log('\n========================================');
      console.log('Please run this SQL manually in the Supabase Dashboard SQL Editor:');
      console.log('========================================\n');
      console.log(sql);
    }
  }
}

main();
