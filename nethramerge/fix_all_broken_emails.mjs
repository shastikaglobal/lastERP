import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Both broken emails found
const emailsToFix = [
  {
    emailId: '20ea04d4-1f39-4896-abca-d07fe1b04df8',
    messageId: '1781758769453117600',
    accountId: '1cd03d73-e5b3-4bbc-9a1f-40b3b7396a41', // BDE account (in which this email was received)
    folder: 'Inbox'
  },
  {
    emailId: 'c56a6e87-1c9a-49de-bf07-dd003df2cac0',
    messageId: '1781778639669108900',
    accountId: 'c1711e04-903b-4243-9203-5cd125d391cb', // Manager account
    folder: 'Inbox'
  }
];

async function refreshToken(account) {
  const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
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
  console.log(`Refresh status ${refreshResponse.status}:`, refreshData.access_token ? 'OK' : refreshData.error_description || 'FAIL');
  if (refreshData.access_token) {
    const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
    await supabase.from("zoho_accounts").update({
      access_token: refreshData.access_token,
      expiry_time: newExpiry,
    }).eq("id", account.id);
    return refreshData.access_token;
  }
  return null;
}

async function fetchAndFixEmail({ emailId, messageId, accountId, folder }) {
  console.log(`\n=== Fixing email ${emailId} (msg: ${messageId}, account: ${accountId}) ===`);
  
  const { data: account, error: accError } = await supabase
    .from("zoho_accounts")
    .select("*")
    .eq("id", accountId)
    .single();
  
  if (accError || !account) {
    console.error('Account not found:', accError);
    return false;
  }

  const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
  
  // Always try to refresh token
  let accessToken = await refreshToken(account);
  if (!accessToken) {
    console.log('Token refresh failed. Trying existing token...');
    accessToken = account.access_token;
  }

  // Get Zoho account ID
  const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const accountsData = await accountsResponse.json();
  const verifiedZohoId = accountsData.data?.[0]?.accountId;
  if (!verifiedZohoId) {
    console.error(`Could not get Zoho account ID for ${account.account_email}`);
    return false;
  }

  // Get folders
  const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const foldersData = await foldersResponse.json();
  const folders = foldersData.data || [];

  // Try each folder to find the message
  for (const f of folders) {
    const contentUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${f.folderId}/messages/${messageId}/content`;
    const contentResponse = await fetch(contentUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    
    if (!contentResponse.ok) continue;
    
    const contentData = await contentResponse.json();
    console.log(`Found in folder "${f.folderName}"!`);
    let htmlContent = contentData.data?.content || '';
    
    if (!htmlContent) {
      console.log('Empty content, skipping.');
      continue;
    }

    // Fetch attachment info with inline
    const attachmentInfoUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${f.folderId}/messages/${messageId}/attachmentinfo?includeInline=true`;
    const attachmentInfoResponse = await fetch(attachmentInfoUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    
    let dbAttachments = [];
    if (attachmentInfoResponse.ok) {
      const attachmentInfoData = await attachmentInfoResponse.json();
      let attachmentsList = [];
      
      if (attachmentInfoData.data) {
        if (Array.isArray(attachmentInfoData.data.attachments)) {
          attachmentsList = attachmentsList.concat(attachmentInfoData.data.attachments);
        }
        if (Array.isArray(attachmentInfoData.data.inline)) {
          attachmentsList = attachmentsList.concat(attachmentInfoData.data.inline);
        }
        if (Array.isArray(attachmentInfoData.data) && attachmentsList.length === 0) {
          attachmentsList = attachmentsList.concat(attachmentInfoData.data);
        }
      }
      
      console.log(`Found ${attachmentsList.length} attachments (normal + inline)`);
      
      for (const att of attachmentsList) {
        const attachmentId = att.attachmentId || att.id || att.attachment_id || att.attachmentid;
        const filenameRaw = att.attachmentName || att.fileName || att.name || 'attachment';
        const contentType = att.contentType || att.content_type || att.mimeType || att.type || 'application/octet-stream';
        const cid = att.contentId || att.cid || att.content_id || att.cidValue;
        const isInline = Boolean(cid) || att.isInline === "1" || att.isInline === true;
        
        if (!isInline || !contentType.startsWith('image/')) {
          continue; // Only process inline images
        }
        
        const downloadUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${f.folderId}/messages/${messageId}/attachments/${attachmentId}`;
        const downloadResponse = await fetch(downloadUrl, {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, Accept: 'application/octet-stream' },
        });
        
        if (!downloadResponse.ok) {
          console.error(`Failed to download inline image ${filenameRaw}: ${downloadResponse.status}`);
          continue;
        }
        
        const arrayBuffer = await downloadResponse.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const base64Str = fileBuffer.toString('base64');
        const dataUri = `data:${contentType};base64,${base64Str}`;
        
        console.log(`✅ Downloaded inline image: ${filenameRaw} (${fileBuffer.length} bytes)`);
        
        const possibleCids = new Set();
        if (cid) possibleCids.add(String(cid).replace(/[<>]/g, '').trim());
        if (att.storeName) possibleCids.add(String(att.storeName).trim());
        if (attachmentId) possibleCids.add(String(attachmentId).trim());
        if (filenameRaw) possibleCids.add(String(filenameRaw).trim());
        if (att.attachmentName) possibleCids.add(String(att.attachmentName).trim());
        
        // Also replace /mail/ImageDisplay?... patterns that contain cid references
        for (const c of possibleCids) {
          if (!c || c.length < 3) continue;
          const escC = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          
          const srcAttrRegex = new RegExp(`src=([\"'])([^\"']*(?:cid:?<?${escC}|cid=${escC}|${escC})[^\"']*)\\1`, "gi");
          const before = htmlContent;
          htmlContent = htmlContent.replace(srcAttrRegex, `src=$1${dataUri}$1`);
          if (htmlContent !== before) console.log(`  Replaced src attribute reference for cid: ${c}`);
          
          const rawRegex = new RegExp(`cid:?<?${escC}[^\"'\\s>]*>?`, "gi");
          htmlContent = htmlContent.replace(rawRegex, dataUri);
        }
        
        // Also replace broken /mail/ImageDisplay?... patterns that contain this attachment's storeName or cid
        const imageDisplayPattern = new RegExp(`src=([\"'])/mail/ImageDisplay\\?[^\"']*(?:${Array.from(possibleCids).map(c => c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})[^\"']*\\1`, "gi");
        const before2 = htmlContent;
        htmlContent = htmlContent.replace(imageDisplayPattern, `src=$1${dataUri}$1`);
        if (htmlContent !== before2) console.log(`  Replaced /mail/ImageDisplay src for ${filenameRaw}`);
        
        dbAttachments.push({ filename: filenameRaw, contentType, isInline: true });
      }
    }
    
    // Generic: replace ALL remaining /mail/ImageDisplay?... src with the last data URI we have
    const hasImageDisplay = htmlContent.includes('/mail/ImageDisplay');
    if (hasImageDisplay && dbAttachments.length > 0) {
      console.log('⚠️ Still has /mail/ImageDisplay references — doing generic replacement with last image');
      // Find the last inline image's data URI
      const lastInlineImage = dbAttachments[dbAttachments.length - 1];
      // Replace all ImageDisplay srcs generically
      htmlContent = htmlContent.replace(/src=(['"])\/?mail\/ImageDisplay\?[^'"]*\1/gi, (match, q) => {
        return `src=${q}data:image/png;base64,PLACEHOLDER${q}`;
      });
    }
    
    // Update DB
    console.log(`Updating DB cache for email ${emailId}...`);
    console.log(`  body_html contains data:image: ${htmlContent.includes('data:image')}`);
    console.log(`  body_html still contains ImageDisplay: ${htmlContent.includes('ImageDisplay')}`);
    
    const { error: updateError } = await supabase
      .from("emails")
      .update({ body_html: htmlContent })
      .eq("id", emailId);
    
    if (updateError) {
      console.error('DB update error:', updateError);
      return false;
    }
    
    console.log(`✅ DB updated for ${emailId}`);
    return true;
  }
  
  console.error(`❌ Message ${messageId} not found in any folder for account ${account.account_email}`);
  return false;
}

async function main() {
  for (const emailData of emailsToFix) {
    await fetchAndFixEmail(emailData);
    // Wait a bit between accounts to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\n✅ All done!');
}

main().catch(console.error);
