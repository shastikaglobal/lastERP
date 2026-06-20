import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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
  // 1. Check zoho_accounts
  console.log('\n=== Zoho Accounts ===');
  const { data: accounts, error } = await supabase
    .from('zoho_accounts')
    .select('id, account_email, zoho_account_id, expiry_time, access_token, refresh_token, company_id');

  if (error) { console.error('Error fetching accounts:', error.message); return; }
  if (!accounts?.length) { console.error('❌ No zoho_accounts found!'); return; }

  const now = new Date();
  for (const acc of accounts) {
    const expiry = new Date(acc.expiry_time);
    const msLeft = expiry - now;
    const isExpired = msLeft < 0;
    const expiresIn = isExpired ? `EXPIRED ${Math.abs(Math.round(msLeft/60000))}m ago` : `expires in ${Math.round(msLeft/60000)}m`;
    console.log(`\n📧 ${acc.account_email}`);
    console.log(`   ID: ${acc.id}`);
    console.log(`   Zoho Account ID: ${acc.zoho_account_id || '❌ MISSING'}`);
    console.log(`   Token: ${isExpired ? '❌ EXPIRED' : '✅ Valid'} (${expiresIn})`);
    console.log(`   Has access_token: ${!!acc.access_token}`);
    console.log(`   Has refresh_token: ${!!acc.refresh_token}`);
    console.log(`   company_id: ${acc.company_id}`);
  }

  // 2. Test invoke the edge function directly
  console.log('\n=== Testing webhook-send-email edge function ===');
  const testAccount = accounts[0];
  
  // First insert a test email record
  const { data: emailRow, error: insertErr } = await supabase
    .from('emails')
    .insert({
      account_id: testAccount.id,
      company_id: testAccount.company_id,
      to_address: testAccount.account_email, // send to self as a test
      subject: 'Token Test - ' + new Date().toISOString(),
      body_html: '<p>This is a token health check test email.</p>',
      body_text: 'This is a token health check test email.',
      status: 'draft',
      folder: 'sent',
      received_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertErr) {
    console.error('Failed to insert test email:', insertErr.message);
    return;
  }
  console.log(`Created test email row: ${emailRow.id}`);

  // Invoke the function
  const { data: funcData, error: funcError } = await supabase.functions.invoke('webhook-send-email', {
    body: { record: { ...emailRow, status: 'pending' } }
  });

  if (funcError) {
    console.error('❌ Function invocation error:', funcError.message);
    console.error('   Context:', JSON.stringify(funcError.context));
  } else {
    console.log('Function response:', JSON.stringify(funcData, null, 2));
    if (funcData?.success) {
      console.log('✅ Email sent successfully!');
    } else {
      console.error('❌ Function returned error:', funcData?.error);
    }
  }

  // Clean up test row
  await supabase.from('emails').delete().eq('id', emailRow.id);
  console.log('\nTest email row cleaned up.');
}

main().catch(console.error);
