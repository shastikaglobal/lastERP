import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Parameters for the email from the screenshot
const accountId = "c1711e04-903b-4243-9203-5cd125d391cb";
const messageId = "1781758769453117600";
const emailId = "20ea04d4-1f39-4896-abca-d07fe1b04df8";
const folderName = "Sent";

async function run() {
  console.log("Starting test for inline attachment fetch and database cache repair...");
  
  // 1. Get account from DB
  const { data: account, error: accError } = await supabase
    .from("zoho_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (accError || !account) {
    throw new Error("Account record not found.");
  }

  const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
  
  // 2. Refresh token logic
  let accessToken = account.access_token;
  const now = new Date();
  const expiry = new Date(account.expiry_time);

  if (now.getTime() > expiry.getTime() - 300000) {
    console.log("Token expiring soon. Refreshing...");
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
    console.log("refreshResponse status:", refreshResponse.status);
    console.log("refreshData:", JSON.stringify(refreshData, null, 2));
    if (refreshData.access_token) {
      accessToken = refreshData.access_token;
      const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
      await supabase.from("zoho_accounts").update({
        access_token: accessToken,
        expiry_time: newExpiry,
      }).eq("id", accountId);
      console.log("Token refreshed!");
    } else {
      console.log("Token refresh failed, keeping current token.");
    }
  }

  // 3. Get Account ID from Zoho API
  console.log("Fetching Zoho accounts for token:", accessToken);
  const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const accountsData = await accountsResponse.json();
  console.log("accountsResponse status:", accountsResponse.status);
  console.log("accountsData:", JSON.stringify(accountsData, null, 2));
  const verifiedZohoId = accountsData.data?.[0]?.accountId;
  if (!verifiedZohoId) throw new Error("No verified Zoho account ID found.");

  // 4. Get Folders
  const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const foldersData = await foldersResponse.json();
  console.log("foldersData list:", (foldersData.data || []).map(f => `${f.folderName} (id: ${f.folderId})`));
  
  const targetFolderName = (folderName || 'inbox').toLowerCase();
  let targetFolder = (foldersData.data || []).find(f => f.folderName.toLowerCase() === targetFolderName);
  if (!targetFolder) {
     targetFolder = (foldersData.data || []).find(f => f.folderName.toLowerCase().includes(targetFolderName));
  }
  if (!targetFolder) {
     targetFolder = (foldersData.data || []).find(f => f.folderName.toLowerCase() === 'inbox');
  }
  console.log("selected targetFolder:", targetFolder?.folderName, "id:", targetFolder?.folderId);
  if (!targetFolder) throw new Error(`Could not find ${targetFolderName} folder.`);

  // 5. Fetch content
  console.log("Fetching message content from Zoho...");
  const contentUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${targetFolder.folderId}/messages/${messageId}/content`;
  const contentResponse = await fetch(contentUrl, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const contentData = await contentResponse.json();

  if (!contentResponse.ok) {
    throw new Error(`Zoho Content Error: ${JSON.stringify(contentData)}`);
  }

  let htmlContent = contentData.data?.content || "No content found in this message.";

  // 6. Fetch attachments info with includeInline=true
  console.log("Fetching attachments info from Zoho...");
  const attachmentInfoUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${targetFolder.folderId}/messages/${messageId}/attachmentinfo?includeInline=true`;
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
    }
    
    console.log(`Found ${attachmentsList.length} attachments in info (normal + inline).`);
    
    if (attachmentsList.length > 0) {
      for (const att of attachmentsList) {
        const attachmentId = att.attachmentId || att.id || att.attachment_id || att.attachmentid;
        const filenameRaw = att.attachmentName || att.fileName || att.name || att.attachment_name || att.filename || "attachment";
        const contentType = att.contentType || att.content_type || att.mimeType || att.type || "application/octet-stream";

        const safeName = (filenameRaw || "attachment").replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const storagePath = `mailbox/zoho-${messageId}-${attachmentId}-${safeName}`;

        console.log(`Downloading attachment: ${filenameRaw} (ID: ${attachmentId})...`);
        const downloadUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${targetFolder.folderId}/messages/${messageId}/attachments/${attachmentId}`;
        const downloadResponse = await fetch(downloadUrl, {
          headers: { 
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            Accept: "application/octet-stream"
          },
        });
        
        if (downloadResponse.ok) {
          const arrayBuffer = await downloadResponse.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);

          const cid = att.contentId || att.cid || att.content_id || att.cidValue;
          const isInline = Boolean(cid) || att.isInline === "1" || att.isInline === true || att.inline === true || att.is_inline === 1;

          if (isInline && (contentType || "").toString().startsWith("image/")) {
            try {
              const base64Str = fileBuffer.toString('base64');
              const dataUri = `data:${contentType};base64,${base64Str}`;

              const possibleCids = new Set();
              if (cid) possibleCids.add(String(cid).replace(/[<>]/g, '').trim());
              if (att.storeName) possibleCids.add(String(att.storeName).trim());
              if (attachmentId) possibleCids.add(String(attachmentId).trim());
              if (filenameRaw) possibleCids.add(String(filenameRaw).trim());
              if (att.attachmentName) possibleCids.add(String(att.attachmentName).trim());

              console.log(`Possible CIDs for inlining:`, Array.from(possibleCids));

              for (const c of possibleCids) {
                if (!c || c.length < 3) continue;
                const escC = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                
                const srcAttrRegex = new RegExp(`src=(["'])([^"']*(?:cid:?<?${escC}|cid=${escC}|${escC})[^"']*)\\1`, "gi");
                htmlContent = htmlContent.replace(srcAttrRegex, `src=$1${dataUri}$1`);
                
                const rawRegex = new RegExp(`cid:?<?${escC}[^"'\\s>]*>?`, "gi");
                htmlContent = htmlContent.replace(rawRegex, dataUri);
              }
              console.log(`Inlining process complete for ${filenameRaw}`);
            } catch (err) {
              console.error("Failed to base64 encode inline attachment", err);
            }
          }

          // Upload to Supabase Storage
          console.log(`Uploading ${filenameRaw} to Supabase...`);
          const { error: uploadError } = await supabase.storage
            .from("email-attachments")
            .upload(storagePath, fileBuffer, {
              contentType: contentType || "application/octet-stream",
              upsert: true
            });
            
          if (uploadError) {
            console.error(`Failed to upload ${filenameRaw} to Supabase:`, uploadError);
          } else {
            console.log(`Uploaded ${filenameRaw} to Supabase!`);
            dbAttachments.push({
              filename: filenameRaw,
              path: storagePath,
              contentType: contentType,
              isInline: isInline
            });
          }
        } else {
          console.error(`Failed to download attachment ${filenameRaw}. Status: ${downloadResponse.status}`);
        }
      }
    }
  }

  // 7. Cache in DB
  const updatePayload = { body_html: htmlContent };
  if (dbAttachments.length > 0) {
    updatePayload.attachments = dbAttachments;
  }
  
  console.log("Updating database email cache...");
  const { error: updateError } = await supabase
    .from("emails")
    .update(updatePayload)
    .eq("id", emailId);

  if (updateError) {
    throw updateError;
  }
  
  console.log("SUCCESS! Database email cache repaired successfully.");
  console.log("Repaired HTML contains base64 image data URI:", htmlContent.includes("data:image"));
}

run().catch(console.error);
