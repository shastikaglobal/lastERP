import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Email 2: Shastika Bde1 greetings - from Manager account
const emailId = 'c56a6e87-1c9a-49de-bf07-dd003df2cac0';
const messageId = '1781778639669108900';
const accountId = 'c1711e04-903b-4243-9203-5cd125d391cb';

async function run() {
  const { data: account } = await supabase.from('zoho_accounts').select('*').eq('id', accountId).single();
  const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';

  // Refresh token
  const clientId = env.VITE_ZOHO_CLIENT_ID;
  const clientSecret = env.ZOHO_CLIENT_SECRET;
  const refreshResponse = await fetch(`https://accounts.${apiDomain}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: account.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const refreshData = await refreshResponse.json();
  console.log('Refresh result:', refreshData.access_token ? 'OK' : refreshData.error_description);
  
  const accessToken = refreshData.access_token || account.access_token;

  const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const accountsData = await accountsResponse.json();
  const verifiedZohoId = accountsData.data?.[0]?.accountId;
  console.log('Zoho Account ID:', verifiedZohoId);
  
  const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const foldersData = await foldersResponse.json();
  const folders = foldersData.data || [];

  // Find the message
  let foundFolder = null;
  let htmlContent = '';
  
  for (const f of folders) {
    const url = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${f.folderId}/messages/${messageId}/content`;
    const resp = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.data?.content) {
        foundFolder = f;
        htmlContent = data.data.content;
        console.log(`Found in folder: ${f.folderName}`);
        break;
      }
    }
  }

  if (!foundFolder) { console.error('Message not found in any folder!'); return; }

  // Fetch attachments
  const attachInfoUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${foundFolder.folderId}/messages/${messageId}/attachmentinfo?includeInline=true`;
  const attachInfoResp = await fetch(attachInfoUrl, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
  const attachInfoData = await attachInfoResp.json();
  console.log('Attachment info:', JSON.stringify(attachInfoData, null, 2));
}

run().catch(console.error);
