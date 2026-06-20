import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // Contains companyId:userId

  if (!code || !state) {
    return new Response(JSON.stringify({ error: "Missing code or state" }), { status: 400 });
  }

  const [companyId, userId, ...originParts] = state.split(":");
  const originUrl = originParts.join(":") || Deno.env.get("FRONTEND_URL") || "http://localhost:8080";

  const clientId = Deno.env.get("ZOHO_CLIENT_ID");
  const clientSecret = Deno.env.get("ZOHO_CLIENT_SECRET");
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/zoho-oauth`;

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch("https://accounts.zoho.in/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error);
    }

    // 2. Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Get user info from Zoho to get the email address and account ID
    const userResponse = await fetch("https://mail.zoho.in/api/accounts", {
      headers: { Authorization: `Zoho-oauthtoken ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();
    const accountInfo = userData.data[0];
    let accountEmail = accountInfo.incomingMailAddress || accountInfo.primaryEmailAddress || accountInfo.accountName;
    if (!accountEmail.includes("@")) {
      accountEmail = `${accountEmail}@zoho.in`;
    }
    const zohoAccountId = accountInfo.accountId;

    // 4. Store tokens in DB
    const expiryTime = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase.from("zoho_accounts").upsert({
      company_id: companyId,
      user_id: userId,
      account_email: accountEmail,
      zoho_account_id: zohoAccountId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_time: expiryTime,
    }, { onConflict: "company_id, account_email" });

    if (upsertError) throw upsertError;

    // 5. Redirect back to frontend dynamically
    const cleanOrigin = originUrl.trim().endsWith('/') ? originUrl.trim().slice(0, -1) : originUrl.trim();
    return Response.redirect(`${cleanOrigin}/system/integrations/zoho?success=true`, 302);

  } catch (err) {
    console.error("Zoho OAuth Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
