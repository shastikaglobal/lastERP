import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { accountId, messageId, emailId, folderName } = await req.json();

    if (!accountId || !messageId || !emailId) {
      throw new Error("Missing required parameters");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get account from DB
    const { data: account, error: accError } = await supabase
      .from("zoho_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (accError || !account) throw new Error("Account record not found.");

    const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';
    
    // 2. Refresh token logic
    let accessToken = account.access_token;
    const now = new Date();
    const expiry = new Date(account.expiry_time);

    if (now.getTime() > expiry.getTime() - 300000) {
      const refreshResponse = await fetch(`https://accounts.${apiDomain}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: account.refresh_token,
          client_id: Deno.env.get("ZOHO_CLIENT_ID")!,
          client_secret: Deno.env.get("ZOHO_CLIENT_SECRET")!,
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
    if (!verifiedZohoId) throw new Error("No verified Zoho account ID found.");

    // 4. Get Folders to find the target folderId
    const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const foldersData = await foldersResponse.json();
    
    const targetFolderName = (folderName || 'inbox').toLowerCase();
    let targetFolder = (foldersData.data || []).find((f: any) => f.folderName.toLowerCase() === targetFolderName);
    
    // If exact match fails, maybe it's nested or we just fallback to searching
    if (!targetFolder) {
       targetFolder = (foldersData.data || []).find((f: any) => f.folderName.toLowerCase().includes(targetFolderName));
    }
    
    // Default to inbox if still not found
    if (!targetFolder) {
       targetFolder = (foldersData.data || []).find((f: any) => f.folderName.toLowerCase() === 'inbox');
    }

    if (!targetFolder) throw new Error(`Could not find ${targetFolderName} or Inbox folder.`);

    // 5. Fetch specific message content
    const contentUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${targetFolder.folderId}/messages/${messageId}/content`;
    const contentResponse = await fetch(contentUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const contentData = await contentResponse.json();

    if (!contentResponse.ok) {
      throw new Error(`Zoho Content Error: ${contentData.status?.description || JSON.stringify(contentData)}`);
    }

    let htmlContent = contentData.data?.content || "No content found in this message.";

    // If the content is plain text, preserve its formatting and newlines
    if (!htmlContent.includes("<html") && !htmlContent.includes("<body") && !htmlContent.includes("<div") && !htmlContent.includes("<p>") && !htmlContent.includes("<br")) {
      htmlContent = `<div style="font-family: sans-serif; white-space: pre-wrap; font-size: 14px; padding: 12px;">${htmlContent}</div>`;
    }

    // 6. Fetch attachments info and download them
    const attachmentInfoUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${targetFolder.folderId}/messages/${messageId}/attachmentinfo?includeInline=true`;
    const attachmentInfoResponse = await fetch(attachmentInfoUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    
    const dbAttachments: any[] = [];
    let attachmentDebugInfo = null;
    if (attachmentInfoResponse.ok) {
      const attachmentInfoData = await attachmentInfoResponse.json();
      attachmentDebugInfo = attachmentInfoData;
      let attachmentsList: any[] = [];
      
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
        console.log(`Found ${attachmentsList.length} attachments to download...`);
        for (const att of attachmentsList) {
          // Normalize common Zoho attachment field names
          const attachmentId = att.attachmentId || att.id || att.attachment_id || att.attachmentId || att.attachmentid;
          const filenameRaw = att.attachmentName || att.fileName || att.name || att.attachment_name || att.filename || "attachment";
          const contentType = att.contentType || att.content_type || att.mimeType || att.type || "application/octet-stream";

          const safeName = (filenameRaw || "attachment").replace(/[^a-zA-Z0-9.\-_]/g, "_");
          const storagePath = `mailbox/zoho-${messageId}-${attachmentId}-${safeName}`;

          // Download attachment content from Zoho (try normalized attachment id)
          const downloadUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${targetFolder.folderId}/messages/${messageId}/attachments/${attachmentId}`;
          const downloadResponse = await fetch(downloadUrl, {
            headers: { 
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              Accept: "application/octet-stream"
            },
          });
          
          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            // Check if it's an inline image (used in the body)
            const possibleCids = new Set<string>();
            const cid = att.contentId || att.cid || att.content_id || att.cidValue;
            if (cid) {
              possibleCids.add(String(cid).replace(/[<>]/g, '').trim());
            }
            if (att.storeName) possibleCids.add(String(att.storeName).trim());
            if (attachmentId) possibleCids.add(String(attachmentId).trim());
            if (filenameRaw) possibleCids.add(String(filenameRaw).trim());
            if (att.attachmentName) possibleCids.add(String(att.attachmentName).trim());

            const isInline = Boolean(cid) || att.isInline === "1" || att.isInline === true || att.inline === true || att.is_inline === 1;

            if (isInline && (contentType || "").toString().startsWith("image/")) {
              try {
                // Ensure we use Uint8Array for base64
                const base64Str = encode(fileData instanceof Uint8Array ? fileData : new Uint8Array(fileData));
                const dataUri = `data:${contentType};base64,${base64Str}`;

                for (const c of possibleCids) {
                  if (!c || c.length < 3) continue; // avoid matching very short strings
                  const escC = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                  
                  // Match src="...cid:<?c... " or src="...cid=c... " or src="...c..."
                  const srcAttrRegex = new RegExp(`src=(["'])([^"']*(?:cid:?<?${escC}|cid=${escC}|${escC})[^"']*)\\1`, "gi");
                  htmlContent = htmlContent.replace(srcAttrRegex, `src=$1${dataUri}$1`);
                  
                  // Also match raw cid:<?c>? references (fallback)
                  const rawRegex = new RegExp(`cid:?<?${escC}[^"'\\s>]*>?`, "gi");
                  htmlContent = htmlContent.replace(rawRegex, dataUri);
                }
              } catch (err) {
                console.error("Failed to base64 encode inline attachment", err);
              }
            }

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from("email-attachments")
              .upload(storagePath, fileData, {
                contentType: contentType || "application/octet-stream",
                upsert: true
              });
              
            if (uploadError) {
              console.error(`Failed to upload attachment ${att.attachmentName} to Supabase Storage:`, uploadError);
            } else {
              console.log(`Successfully uploaded ${att.attachmentName} to Supabase Storage!`);
              dbAttachments.push({
                filename: att.attachmentName,
                path: storagePath,
                contentType: att.contentType || "application/octet-stream",
                isInline: isInline
              });
            }
          } else {
            console.error(`Failed to download attachment ${att.attachmentName} from Zoho. Status: ${downloadResponse.status}`);
          }
        }
      }
    }

    // 7. Cache the HTML body & attachments in our database so we don't fetch it again!
    const updatePayload: any = {
      body_html: htmlContent
    };
    if (dbAttachments.length > 0) {
      updatePayload.attachments = dbAttachments;
    }
    
    await supabase.from("emails").update(updatePayload).eq("id", emailId);

    return new Response(JSON.stringify({ 
      success: true, 
      content: htmlContent,
      attachments: dbAttachments.length > 0 ? dbAttachments : null,
      debug: attachmentDebugInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
