import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const accountId = "c1711e04-903b-4243-9203-5cd125d391cb";
const messageId = "1781778639669108900";
const emailId = "c56a6e87-1c9a-49de-bf07-dd003df2cac0";
const folderName = "Inbox";

async function runDebug() {
  // 1. Get account
  const { data: account } = await supabase
    .from("zoho_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
  let accessToken = account.access_token;
  
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
  if (refreshData.access_token) {
    accessToken = refreshData.access_token;
  }

  // Get Account ID
  const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const accountsData = await accountsResponse.json();
  const verifiedZohoId = accountsData.data?.[0]?.accountId;
  console.log("Verified Zoho ID:", verifiedZohoId);

  // Get Folder ID
  const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const foldersData = await foldersResponse.json();
  const targetFolder = foldersData.data.find(f => f.folderName.toLowerCase() === folderName.toLowerCase());
  console.log("Folder:", targetFolder.folderName, "ID:", targetFolder.folderId);

  // Fetch Attachment Info
  const attachmentInfoUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${targetFolder.folderId}/messages/${messageId}/attachmentinfo?includeInline=true`;
  const attachmentInfoResponse = await fetch(attachmentInfoUrl, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  
  console.log("Attachment Info Status (includeInline):", attachmentInfoResponse.status);
  const attachmentInfoData = await attachmentInfoResponse.json();
  console.log("Attachment Info Data:", JSON.stringify(attachmentInfoData, null, 2));
}

runDebug().catch(console.error);
