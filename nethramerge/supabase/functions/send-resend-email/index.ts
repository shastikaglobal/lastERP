import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { to, subject, html, text, companyId, referenceId, moduleName } = body;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Default sender (update with verified domain once available)
    const fromAddress = "Shastika ERP <notifications@your-verified-domain.com>";

    // Log the attempt
    let logId;
    try {
      const { data, error } = await supabaseClient.from("email_logs").insert({
        company_id: companyId,
        action: "send_transactional",
        status: "pending",
        details: { to, subject, module: moduleName, reference_id: referenceId }
      }).select().single();
      if (data) logId = data.id;
    } catch (e) {
      console.error("Failed to log pending status", e);
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
        text: text,
      })
    });

    const result = await resendRes.json();

    if (!resendRes.ok) {
      if (logId) {
        await supabaseClient.from("email_logs").update({
          status: "error",
          details: { ...body, error: result }
        }).eq("id", logId);
      }
      throw new Error(result.message || JSON.stringify(result));
    }

    // Update log with success status for Realtime UI updates
    if (logId) {
      await supabaseClient.from("email_logs").update({
        status: "success",
        details: { ...body, resend_id: result.id }
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
