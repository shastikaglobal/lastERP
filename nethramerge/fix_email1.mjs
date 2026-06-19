import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Email 1: Manager's "test mail" - note account_id says BDE (1cd03d73) but message was SENT by Manager
// Since message id 1781758769453117600 is sent by Manager account, we need to check Manager account
const emailId = '20ea04d4-1f39-4896-abca-d07fe1b04df8';
const messageId = '1781758769453117600';

async function run() {
  // Check both accounts for this message
  const { data: accounts } = await supabase.from('zoho_accounts').select('*');
  const clientId = env.VITE_ZOHO_CLIENT_ID;
  const clientSecret = env.ZOHO_CLIENT_SECRET;
  
  const { data: emailData } = await supabase.from('emails').select('body_html').eq('id', emailId).single();
  let htmlContent = emailData?.body_html || '';
  
  console.log('HTML has ImageDisplay:', htmlContent.includes('ImageDisplay'));
  const matches = htmlContent.match(/ImageDisplay\?[^'"&\s]+[^'"]*|ImageDisplay\?[^'"]+/g);
  console.log('ImageDisplay occurrences:', matches?.slice(0, 3));

  for (const account of accounts) {
    if (account.account_email.includes('bde')) {
      console.log('\nSkipping BDE account (rate limited)');
      continue;
    }
    
    console.log(`\nTrying account: ${account.account_email}`);
    const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
    
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
    const accessToken = refreshData.access_token || account.access_token;
    if (!refreshData.access_token) {
      console.log('Refresh failed:', refreshData.error_description);
      // Try existing token
    } else {
      console.log('Token refreshed!');
    }

    const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const accountsData = await accountsResponse.json();
    const verifiedZohoId = accountsData.data?.[0]?.accountId;
    if (!verifiedZohoId) { console.log('No Zoho ID found'); continue; }

    const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const foldersData = await foldersResponse.json();
    const folders = foldersData.data || [];

    for (const f of folders) {
      const url = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${f.folderId}/messages/${messageId}/content`;
      const resp = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.data?.content) {
          console.log(`Found in folder: ${f.folderName}!`);
          
          // Get attachment info
          const attachInfoResp = await fetch(
            `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${f.folderId}/messages/${messageId}/attachmentinfo?includeInline=true`,
            { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
          );
          const attachInfo = await attachInfoResp.json();
          console.log('Attachment info:', JSON.stringify(attachInfo, null, 2));
          
          const inlineAtts = [...(attachInfo.data?.attachments || []), ...(attachInfo.data?.inline || [])];
          
          for (const att of inlineAtts) {
            const attId = att.attachmentId || att.id;
            const cid = att.contentId || att.cid || att.cidValue;
            const contentType = att.contentType || att.mimeType || 'image/jpeg';
            const isInline = Boolean(cid) || att.isInline === '1';
            
            if (!isInline || !contentType.startsWith('image/')) continue;
            
            const downloadUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${f.folderId}/messages/${messageId}/attachments/${attId}`;
            const dlResp = await fetch(downloadUrl, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, Accept: 'application/octet-stream' } });
            if (!dlResp.ok) { console.error('Download failed:', dlResp.status); continue; }
            
            const buf = Buffer.from(await dlResp.arrayBuffer());
            const dataUri = `data:${contentType};base64,${buf.toString('base64')}`;
            console.log(`Downloaded inline image ${att.attachmentName} (${buf.length} bytes)`);
            
            // Apply replacements
            const cleanCid = cid ? String(cid).replace(/[<>]/g, '').trim() : null;
            const possibleCids = new Set([cleanCid, att.storeName, attId, att.attachmentName].filter(Boolean));
            
            for (const c of possibleCids) {
              if (!c || c.length < 3) continue;
              const escC = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
              const srcAttrRegex = new RegExp(`src=(['"])([^'"]*(?:cid:?<?${escC}|cid=${escC}|${escC})[^'"]*)\\1`, "gi");
              htmlContent = htmlContent.replace(srcAttrRegex, `src=$1${dataUri}$1`);
            }
            
            // Generic fallback
            if (htmlContent.includes('/mail/ImageDisplay')) {
              htmlContent = htmlContent.replace(/src=(['"])\/?mail\/ImageDisplay\?[^'"]*\1/gi, `src=$1${dataUri}$1`);
            }
          }
          
          console.log('\nFinal state:');
          console.log('Has ImageDisplay:', htmlContent.includes('ImageDisplay'));
          console.log('Has data:image:', htmlContent.includes('data:image'));
          
          const { error } = await supabase.from('emails').update({ body_html: htmlContent }).eq('id', emailId);
          if (error) console.error('DB error:', error);
          else console.log('✅ DB updated!');
          return;
        }
      }
    }
    console.log(`Message not found in account ${account.account_email}`);
  }
  
  console.log('\nℹ️ Could not fix email 1 - BDE token is rate limited. It will auto-fix when user opens the email (the frontend triggers a re-fetch).');
  
  // Nullify the broken body_html so the frontend knows to re-fetch fresh from Zoho
  console.log('Clearing broken cached body_html so frontend re-fetches from Zoho...');
  const { error } = await supabase.from('emails').update({ body_html: null }).eq('id', emailId);
  if (error) console.error('DB error:', error);
  else console.log('✅ body_html cleared - will be fetched fresh when user opens email');
}

run().catch(console.error);
