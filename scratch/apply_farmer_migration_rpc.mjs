import dotenv from 'dotenv';
dotenv.config();

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sql = `
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_farmer_id ON public.customers (farmer_id);
NOTIFY pgrst, 'reload schema';
`;

async function applyViaRPC() {
  console.log('Trying RPC execute_sql...');
  const res = await fetch(`https://sxebygxpjzntogzpjnga.supabase.co/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql, sql_query: sql }), // passing both query and sql_query just in case
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);
  return res.ok;
}

applyViaRPC();
