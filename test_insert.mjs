import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
  // We can't query pg_policies directly via RPC unless it's exposed.
  // But we can try to use the query builder on a view if it exists.
  // Most likely, we can't.
  
  // Let's try to run a simple insert with the service role to confirm data is there.
  const { data, error } = await supabase.from('bde_daily_reports').insert({
    bde_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
    company_id: '00000000-0000-0000-0000-000000000000',
    report_date: '2026-06-03',
    country: 'Test',
    total_calls: 1,
    calls_attended: 1,
    linkedin_messages: 1,
    emails_sent: 1,
    new_leads: 1
  }).select();

  if (error) {
    console.error('Service role insert failed (this is bad):', error);
  } else {
    console.log('Service role insert worked. RLS is likely the issue on client side.');
    // Delete the test record
    await supabase.from('bde_daily_reports').delete().eq('id', data[0].id);
  }
}

checkPolicies();
