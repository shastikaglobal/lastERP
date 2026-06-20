import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log("INBOUND PAYLOAD:", JSON.stringify(payload, null, 2))

    const fromEmail = payload.from || payload.sender || payload.envelope?.from
    const subject = payload.subject || "No Subject"
    const body = payload.html || payload.text || payload.plain || ""

    if (!fromEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing sender email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 1. Find lead by email
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, company_id, contact_name, assigned_to')
      .eq('email', fromEmail)
      .single()

    if (leadError || !lead) {
      console.log(`No lead found for email: ${fromEmail}`)
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'No matching lead' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 2. Log inbound activity
    const { error: activityError } = await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        title: `Inbound Email: ${subject}`,
        type: 'email_inbound',
        content: body,
        completed: true,
        company_id: lead.company_id
      })

    if (activityError) throw activityError

    // 3. Notify lead owner only if assigned
    if (lead.assigned_to) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          title: 'New Email Received',
          message: `You received an email from ${lead.contact_name || fromEmail}: "${subject}"`,
          type: 'email',
          user_id: lead.assigned_to,
          company_id: lead.company_id,
          link: `/crm/leads/${lead.id}`
        })

      if (notifError) console.error('Notification insert failed:', notifError.message)
    }

    return new Response(
      JSON.stringify({ status: 'success', leadId: lead.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Edge function error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})