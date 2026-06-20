import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { accountId } = await req.json();

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

    // 3. SELF-DISCOVERY: Get the correct Zoho Account ID from the API
    const accountsResponse = await fetch(`https://mail.${apiDomain}/api/accounts`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const accountsData = await accountsResponse.json();
    
    if (!accountsResponse.ok) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Zoho Discovery Error: ${accountsData.status?.description || JSON.stringify(accountsData)}` 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const verifiedZohoId = accountsData.data?.[0]?.accountId;
    if (!verifiedZohoId) throw new Error("No verified Zoho account ID found.");

    // 4. Get Folders to find Inbox folderId
    const foldersResponse = await fetch(`https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const foldersData = await foldersResponse.json();
    
    if (!foldersResponse.ok) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Zoho Folders Error: ${foldersData.status?.description || JSON.stringify(foldersData)}` 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const folders = foldersData.data || [];
    const inboxFolder = folders.find((f: any) => f.folderName.toLowerCase() === 'inbox');
    
    if (!inboxFolder) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Zoho Sync Error: Could not find Inbox folder.` 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const folderId = inboxFolder.folderId;

    // 5. Fetch messages from 'Inbox' using folderId
    const messagesUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/messages/view?folderId=${folderId}&limit=100`;
    
    const messagesResponse = await fetch(messagesUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const messagesData = await messagesResponse.json();

    if (!messagesResponse.ok) {
      // RETURN DETAILED ERROR TO FRONTEND
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Zoho Sync Error: ${messagesData.status?.description || JSON.stringify(messagesData)}` 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const messages = messagesData.data || [];

    // 5. Sync to database
    let syncCount = 0;
    for (const msg of messages) {
      const { error } = await supabase
        .from("emails")
        .upsert({
          company_id: account.company_id,
          account_id: account.id, // Track which account this email belongs to
          zoho_message_id: msg.messageId,
          subject: msg.subject || "(No Subject)",
          from_address: msg.sender,
          to_address: msg.toAddress,
          body_text: msg.summary || "Note: Full body content is immediately available for emails composed in the ERP. Full historical bodies require deep sync.",
          received_at: new Date(parseInt(msg.receivedTime)).toISOString(),
          is_read: msg.status === "1",
          folder: "Inbox",
          status: "received",
        }, { onConflict: "zoho_message_id" });
      if (!error) syncCount++;
    }

    return new Response(JSON.stringify({ success: true, syncCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
