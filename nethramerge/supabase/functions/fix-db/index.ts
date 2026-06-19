import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the shared company ID
    const { data: companies } = await supabaseClient.from('companies').select('id').limit(1);
    if (!companies || companies.length === 0) throw new Error("No companies found");
    const sharedCompanyId = companies[0].id;

    // Update profiles with null company_id
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({ company_id: sharedCompanyId })
      .is('company_id', null)
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, fixed_profiles: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
