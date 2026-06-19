const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GET /api/emails/accounts - Fetch zoho accounts
router.get('/accounts', requireAuth, async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from('zoho_accounts').select('*').eq('is_deleted', false);
    if (error) throw error;
    res.json(rows || []);
  } catch (err) {
    console.error("DB Error (get zoho accounts):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/emails - Fetch emails (with optional account_id filter)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { account_id } = req.query;
    let query = supabase.from('emails').select('*').eq('is_deleted', false);
    if (account_id) {
      query = query.eq('account_id', account_id);
    }
    const { data: rows, error } = await query.order('received_at', { ascending: false }).limit(500);
    if (error) throw error;
    res.json(rows || []);
  } catch (err) {
    console.error("DB Error (get emails):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/emails/:id - Fetch single email
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rows, error } = await supabase.from('emails').select('*').eq('id', id).eq('is_deleted', false);
    if (error) throw error;
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Email not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("DB Error (get single email):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/emails/:id - Update email (e.g. status, is_read)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({ success: true });
    
    const { error } = await supabase.from('emails').update(updates).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update email):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/emails - Save sent email log
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    
    const { data: rows, error } = await supabase.from('emails').insert([data]).select();
    if (error) throw error;
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("DB Error (create email log):", err);
    res.status(500).json({ error: err.message || JSON.stringify(err) || "Unknown Error" });
  }
});

// DELETE /api/emails/:id - Delete email log
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('emails').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete email):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/emails/accounts/:id - Soft delete account
router.delete('/accounts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('zoho_accounts').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete zoho account):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/emails/sync - Sync Zoho inbox (replaces Supabase Edge Function)
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId required' });

    const { data: account, error: accError } = await supabase
      .from('zoho_accounts').select('*').eq('id', accountId).single();
    if (accError || !account) return res.status(404).json({ success: false, error: 'Account not found' });

    const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';

    // Refresh token if needed
    let accessToken = account.access_token;
    const now = new Date();
    const expiry = new Date(account.expiry_time);
    if (now.getTime() > expiry.getTime() - 300000) {
      const clientId = process.env.VITE_ZOHO_CLIENT_ID || process.env.ZOHO_CLIENT_ID || '';
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || '';
      const refreshResponse = await fetch(`https://accounts.${apiDomain}/oauth/v2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: account.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });
      const refreshData = await refreshResponse.json();
      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
        await supabase.from('zoho_accounts').update({ access_token: accessToken, expiry_time: newExpiry }).eq('id', accountId);
      } else {
        console.warn(`[Sync] Token refresh failed for ${account.account_email}:`, refreshData.error_description || refreshData.error);
        // Continue with existing token
      }
    }

    // Discover Zoho account ID
    const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const accountsData = await accountsResponse.json();
    if (!accountsResponse.ok) {
      return res.status(200).json({ success: false, error: `Zoho Discovery Error: ${accountsData.status?.description || 'Invalid Access'}` });
    }
    const verifiedZohoId = accountsData.data?.[0]?.accountId;
    if (!verifiedZohoId) return res.status(200).json({ success: false, error: 'No Zoho account found' });

    // Get Inbox folder
    const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const foldersData = await foldersResponse.json();
    const inboxFolder = (foldersData.data || []).find((f) => f.folderName.toLowerCase() === 'inbox');
    if (!inboxFolder) return res.status(200).json({ success: false, error: 'Inbox folder not found' });

    // Fetch messages
    const messagesResponse = await fetch(
      `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/messages/view?folderId=${inboxFolder.folderId}&limit=100`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );
    const messagesData = await messagesResponse.json();
    if (!messagesResponse.ok) {
      return res.status(200).json({ success: false, error: `Zoho Sync Error: ${messagesData.status?.description}` });
    }

    const messages = messagesData.data || [];
    let syncCount = 0;
    for (const msg of messages) {
      const { error } = await supabase.from('emails').upsert({
        company_id: account.company_id,
        account_id: account.id,
        zoho_message_id: msg.messageId,
        subject: msg.subject || '(No Subject)',
        from_address: msg.sender,
        to_address: msg.toAddress,
        body_text: msg.summary || '',
        received_at: new Date(parseInt(msg.receivedTime)).toISOString(),
        is_read: msg.status === '1',
        folder: 'Inbox',
        status: 'received',
      }, { onConflict: 'zoho_message_id' });
      if (!error) syncCount++;
    }

    res.json({ success: true, syncCount });
  } catch (err) {
    console.error('[Backend] Sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/emails/get-zoho-body - Fetch full email body from Zoho and inline attachments
router.post('/get-zoho-body', requireAuth, async (req, res) => {
  try {
    const { accountId, messageId, emailId, folderName } = req.body;

    if (!accountId || !messageId || !emailId) {
      return res.status(400).json({ success: false, error: "Missing required parameters" });
    }

    // 1. Get account from DB
    const { data: account, error: accError } = await supabase
      .from("zoho_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (accError || !account) {
      return res.status(404).json({ success: false, error: "Account record not found." });
    }

    const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
    
    // 2. Refresh token logic
    let accessToken = account.access_token;
    const now = new Date();
    const expiry = new Date(account.expiry_time);

    if (now.getTime() > expiry.getTime() - 300000) {
      const clientId = process.env.VITE_ZOHO_CLIENT_ID || process.env.ZOHO_CLIENT_ID || "";
      const clientSecret = process.env.ZOHO_CLIENT_SECRET || "";
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
        }).eq("id", accountId);
      }
    }

    // 3. Get Account ID from Zoho API
    const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const accountsData = await accountsResponse.json();
    const verifiedZohoId = accountsData.data?.[0]?.accountId;
    if (!verifiedZohoId) {
      return res.status(400).json({ success: false, error: "No verified Zoho account ID found." });
    }

    // 4. Get Folders to find the target folderId
    const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const foldersData = await foldersResponse.json();
    
    const allFolders = foldersData.data || [];
    const targetFolderName = (folderName || 'inbox').toLowerCase();
    let targetFolder = allFolders.find(f => f.folderName.toLowerCase() === targetFolderName);
    
    if (!targetFolder) {
       targetFolder = allFolders.find(f => f.folderName.toLowerCase().includes(targetFolderName));
    }
    if (!targetFolder) {
       targetFolder = allFolders.find(f => f.folderName.toLowerCase() === 'inbox');
    }
    if (!targetFolder) {
      return res.status(404).json({ success: false, error: `Could not find ${targetFolderName} or Inbox folder.` });
    }

    // 5. Fetch specific message content — try target folder first, then scan all folders
    let contentData = null;
    let foundFolder = targetFolder;
    
    const tryContentFetch = async (folder) => {
      const url = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${folder.folderId}/messages/${messageId}/content`;
      const resp = await fetch(url, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.data?.content) return { data, folder };
      }
      return null;
    };
    
    let contentResult = await tryContentFetch(targetFolder);
    if (!contentResult) {
      // Not found in target folder — scan all folders
      console.log(`[Backend] Message ${messageId} not in ${targetFolder.folderName}, scanning all folders...`);
      for (const f of allFolders) {
        if (f.folderId === targetFolder.folderId) continue;
        contentResult = await tryContentFetch(f);
        if (contentResult) {
          console.log(`[Backend] Found message in folder: ${f.folderName}`);
          break;
        }
      }
    }
    
    if (!contentResult) {
      return res.status(404).json({
        success: false,
        error: `Message ${messageId} not found in any folder.`
      });
    }
    
    contentData = contentResult.data;
    foundFolder = contentResult.folder;

    let htmlContent = contentData.data?.content || "No content found in this message.";

    if (!htmlContent.includes("<html") && !htmlContent.includes("<body") && !htmlContent.includes("<div") && !htmlContent.includes("<p>") && !htmlContent.includes("<br")) {
      htmlContent = `<div style="font-family: sans-serif; white-space: pre-wrap; font-size: 14px; padding: 12px;">${htmlContent}</div>`;
    }

    // 6. Fetch attachments info and download them (use foundFolder since message was located there)
    const attachmentInfoUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${foundFolder.folderId}/messages/${messageId}/attachmentinfo?includeInline=true`;
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
      
      if (attachmentsList.length > 0) {
        console.log(`[Backend] Found ${attachmentsList.length} attachments to download...`);
        for (const att of attachmentsList) {
          const attachmentId = att.attachmentId || att.id || att.attachment_id || att.attachmentid;
          const filenameRaw = att.attachmentName || att.fileName || att.name || att.attachment_name || att.filename || "attachment";
          const contentType = att.contentType || att.content_type || att.mimeType || att.type || "application/octet-stream";

          const safeName = (filenameRaw || "attachment").replace(/[^a-zA-Z0-9.\-_]/g, "_");
          const storagePath = `mailbox/zoho-${messageId}-${attachmentId}-${safeName}`;

          const downloadUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${foundFolder.folderId}/messages/${messageId}/attachments/${attachmentId}`;
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

                for (const c of possibleCids) {
                  if (!c || c.length < 3) continue;
                  const escC = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                  
                  const srcAttrRegex = new RegExp(`src=(["'])([^"']*(?:cid:?<?${escC}|cid=${escC}|${escC})[^"']*)\\1`, "gi");
                  htmlContent = htmlContent.replace(srcAttrRegex, `src=$1${dataUri}$1`);
                  
                  const rawRegex = new RegExp(`cid:?<?${escC}[^"'\\s>]*>?`, "gi");
                  htmlContent = htmlContent.replace(rawRegex, dataUri);
                }
                
                // Generic fallback: replace ANY remaining /mail/ImageDisplay?... src with this image
                if (htmlContent.includes('/mail/ImageDisplay')) {
                  console.log(`[Backend] Applying generic /mail/ImageDisplay replacement with ${filenameRaw}`);
                  htmlContent = htmlContent.replace(/src=(['"])\/?mail\/ImageDisplay\?[^'"]*\1/gi, `src=$1${dataUri}$1`);
                }
              } catch (err) {
                console.error("[Backend] Failed to base64 encode inline attachment", err);
              }
            }

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from("email-attachments")
              .upload(storagePath, fileBuffer, {
                contentType: contentType || "application/octet-stream",
                upsert: true
              });
              
            if (uploadError) {
              console.error(`[Backend] Failed to upload ${filenameRaw} to Supabase:`, uploadError);
            } else {
              console.log(`[Backend] Successfully uploaded ${filenameRaw} to Supabase!`);
              dbAttachments.push({
                filename: filenameRaw,
                path: storagePath,
                contentType: contentType,
                isInline: isInline
              });
            }
          } else {
            console.error(`[Backend] Failed to download attachment ${filenameRaw}. Status: ${downloadResponse.status}`);
          }
        }
      }
    }

    // 7. Cache in DB
    const updatePayload = { body_html: htmlContent };
    if (dbAttachments.length > 0) {
      updatePayload.attachments = dbAttachments;
    }
    await supabase.from("emails").update(updatePayload).eq("id", emailId);

    res.json({
      success: true,
      content: htmlContent,
      attachments: dbAttachments.length > 0 ? dbAttachments : null
    });

  } catch (err) {
    console.error("[Backend] Error in get-zoho-body route:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
