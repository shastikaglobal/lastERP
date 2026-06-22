import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Sign in or get user token. We can use the service role token itself as the bearer token
  // because requireAuth verifies the JWT using the same service role key!
  // Wait, let's verify if requireAuth accepts the service role token.
  // The service role key is a valid JWT signed by Supabase. So it will verify successfully.
  const token = SUPABASE_SERVICE_ROLE_KEY;

  try {
    const url = 'http://localhost:8082/api/customers?company_id=00000000-0000-0000-0000-00000000ae01';
    console.log(`Fetching from local API: ${url}`);
    
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Status:', resp.status);
    const body = await resp.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run();
