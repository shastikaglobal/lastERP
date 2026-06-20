import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import fetch from 'node-fetch';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')]; })
);

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: account, error } = await supabase
    .from('zoho_accounts')
    .select('*')
    .eq('account_email', 'bde@shastikaglobalimpex.co.in')
    .single();

  if (error || !account) {
    console.error("Account not found:", error?.message || "Not found");
    return;
  }

  console.log(`Attempting to refresh token for ${account.account_email}...`);
  console.log(`Client ID: ${env.VITE_ZOHO_CLIENT_ID}`);
  console.log(`Refresh Token: ${account.refresh_token.substring(0, 15)}...`);

  const refreshResponse = await fetch(`https://accounts.zoho.in/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: account.refresh_token,
      client_id: env.VITE_ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  const refreshData = await refreshResponse.json();
  console.log("Response:", refreshData);
}

main().catch(console.error);
