import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the exact email and attachment data based on the user's screenshot
    const { data: emails } = await supabaseAdmin
      .from("emails")
      .select("id, subject, attachments")
      .ilike("subject", "%International data%")
      .limit(5);

    // Let's also download the attachment to verify if it's empty
    const results = [];
    if (emails && emails.length > 0) {
      for (const email of emails) {
        if (email.attachments && email.attachments.length > 0) {
          for (const att of email.attachments) {
            const { data: fileData, error: fileErr } = await supabaseAdmin.storage
              .from("email-attachments")
              .download(att.path);
              
            results.push({
              subject: email.subject,
              filename: att.filename,
              path: att.path,
              size: fileData?.size || 0,
              type: fileData?.type || 'unknown',
              downloadError: fileErr?.message || null
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ results }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
