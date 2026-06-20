import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')]; })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  // Get the first account
  const { data: accounts } = await supabase
    .from('zoho_accounts')
    .select('*')
    .limit(1);
  
  const acc = accounts[0];
  console.log('Using account:', acc.account_email);

  // Insert test email
  const { data: emailRow } = await supabase
    .from('emails')
    .insert({
      account_id: acc.id,
      company_id: acc.company_id,
      to_address: acc.account_email,
      subject: 'Debug Test - ' + new Date().toISOString(),
      body_html: '<p>Debug test.</p>',
      body_text: 'Debug test.',
      status: 'draft',
      folder: 'sent',
      received_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  console.log('Test email ID:', emailRow.id);

  // Call via raw fetch to see the actual error body
  const resp = await fetch(`${supabaseUrl}/functions/v1/webhook-send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceKey,
    },
    body: JSON.stringify({ record: { ...emailRow, status: 'pending' } }),
  });

  const responseText = await resp.text();
  console.log('\n=== Raw Function Response ===');
  console.log('Status:', resp.status, resp.statusText);
  console.log('Body:', responseText);

  // Try to parse
  try {
    const parsed = JSON.parse(responseText);
    console.log('\nParsed:', JSON.stringify(parsed, null, 2));
  } catch (_) {}

  // Also try manual token refresh
  const apiDomain = acc.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
  console.log('\n=== Testing Zoho Token Refresh Directly ===');
  console.log('API Domain:', apiDomain);
  
  const ZOHO_CLIENT_ID = '1000.KBG65EMLVZIF4GSE6VNLD0CZFPZ3SY';
  const ZOHO_CLIENT_SECRET = '3b28ad8721767956606d6ab766a5e4a53753ed7691';
  
  const refreshResp = await fetch(`https://accounts.${apiDomain}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: acc.refresh_token,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  const refreshData = await refreshResp.json();
  console.log('Refresh response:', JSON.stringify(refreshData, null, 2));
  if (refreshData.access_token) {
    console.log('✅ Token refresh works locally!');
  } else {
    console.error('❌ Token refresh failed. This is the root cause.');
  }

  // Cleanup
  await supabase.from('emails').delete().eq('id', emailRow.id);
  console.log('\nTest row cleaned up.');
}

main().catch(console.error);
