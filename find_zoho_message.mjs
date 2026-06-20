import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const messageId = "1781758769453117600";

async function run() {
  const { data: accounts } = await supabase.from('zoho_accounts').select('*');
  
  for (const account of accounts) {
    console.log(`Checking account: ${account.account_email}...`);
    const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
    
    // Refresh token
    let accessToken = account.access_token;
    const now = new Date();
    const expiry = new Date(account.expiry_time);

    if (now.getTime() > expiry.getTime() - 300000) {
      console.log(`Refreshing token for ${account.account_email}...`);
      const clientId = env.VITE_ZOHO_CLIENT_ID;
      const clientSecret = env.ZOHO_CLIENT_SECRET;
      try {
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
          const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
          await supabase.from("zoho_accounts").update({
            access_token: accessToken,
            expiry_time: newExpiry,
          }).eq("id", account.id);
          console.log(`Refreshed token for ${account.account_email}!`);
        } else {
          console.log(`Refresh failed for ${account.account_email}:`, JSON.stringify(refreshData));
          continue;
        }
      } catch (err) {
        console.error(`Refresh error for ${account.account_email}:`, err);
        continue;
      }
    }

    try {
      const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });
      const accountsData = await accountsResponse.json();
      const verifiedZohoId = accountsData.data?.[0]?.accountId;
      if (!verifiedZohoId) {
        console.log(`No verified Zoho ID for ${account.account_email}`);
        continue;
      }

      // Get Folders
      const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });
      const foldersData = await foldersResponse.json();
      const folders = foldersData.data || [];

      for (const folder of folders) {
        // Try to fetch message content
        const contentUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${folder.folderId}/messages/${messageId}/content`;
        const contentResponse = await fetch(contentUrl, {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        });
        
        if (contentResponse.ok) {
          console.log(`🎯 FOUND! Message ID ${messageId} is in folder "${folder.folderName}" (id: ${folder.folderId}) of account ${account.account_email}!`);
          return;
        }
      }
    } catch (err) {
      console.error(`Error checking folders for ${account.account_email}:`, err);
    }
  }
  console.log("Finished checking all accounts. Message not found anywhere.");
}

run();
