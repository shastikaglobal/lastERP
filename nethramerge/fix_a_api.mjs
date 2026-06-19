import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sql = `
ALTER TABLE acquisition_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON acquisition_channels;
CREATE POLICY "allow_all" ON acquisition_channels
FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
`;

async function main() {
  console.log('Applying RLS via API endpoints...');

  const sqlRes = await fetch(`${SUPABASE_URL}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (sqlRes.ok) {
    console.log('✅ Applied via /sql!');
  } else {
    console.log(`❌ /sql failed (${sqlRes.status}). Trying /pg/query...`);
    const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (pgRes.ok) {
      console.log('✅ Applied via /pg/query!');
    } else {
      console.log(`❌ /pg/query failed (${pgRes.status}).`);
      
      // Let's also try exec_sql one more time properly just in case
      console.log('Trying rpc exec_sql...');
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sql_query: sql })
      });
      if (rpcRes.ok) {
         console.log('✅ Applied via /rest/v1/rpc/exec_sql!');
      } else {
        const rpcRes2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql: sql })
        });
        if(rpcRes2.ok) console.log('✅ Applied via /rest/v1/rpc/exec_sql with sql param!');
        else console.log('❌ all failed');
      }
    }
  }
}

main();
