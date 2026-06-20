import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://sxebygxpjzntogzpjnga.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4"
);

async function diagnose() {
  console.log("--- DIAGNOSING CRM DATA ---");

  // 1. Activities
  console.log("\n1. Activities Table:");
  const { data: actData, error: actErr } = await supabase.from('activities').select('*').limit(5);
  if (actErr) {
    console.error("Activities Error:", actErr);
  } else {
    console.log("Columns:", Object.keys(actData[0] || {}));
    const { data: actStatuses } = await supabase.from('activities').select('completed'); // I suspect 'completed' exists
    const statuses = [...new Set(actData.map(a => JSON.stringify(a.status || a.completed)))];
    console.log("Sample Data Statuses/Completed:", statuses);
    // Let's also check if 'status' column exists
    const { data: actStatusCheck } = await supabase.from('activities').select('status').limit(1);
    if (actStatusCheck) console.log("Status column exists!");
    else console.log("Status column likely does NOT exist.");
  }

  // 2. Leads
  console.log("\n2. Leads Table:");
  const { data: leadData, error: leadErr } = await supabase.from('leads').select('*').limit(5);
  if (leadErr) {
    console.error("Leads Error:", leadErr);
  } else {
    console.log("Columns:", Object.keys(leadData[0] || {}));
    const allStages = await supabase.from('leads').select('stage');
    const stages = [...new Set((allStages.data || []).map(l => l.stage))];
    console.log("All distinct 'stage' values:", stages);
    const allStatus = await supabase.from('leads').select('status');
    if (allStatus.data) console.log("All distinct 'status' values:", [...new Set(allStatus.data.map(l => l.status))]);
  }

  // 3. Quotations
  console.log("\n3. Quotations Table:");
  const { data: quoteData, error: quoteErr } = await supabase.from('quotations').select('*').limit(5);
  if (quoteErr) {
    console.error("Quotations Error:", quoteErr);
  } else {
    console.log("Columns:", Object.keys(quoteData[0] || {}));
    const allQuoteStatus = await supabase.from('quotations').select('status');
    console.log("All distinct 'status' values:", [...new Set((allQuoteStatus.data || []).map(q => q.status))]);
    // Check for monetary columns
    const moneyCols = Object.keys(quoteData[0] || {}).filter(k => k.includes('amount') || k.includes('total') || k.includes('value'));
    console.log("Potential money columns:", moneyCols);
  }

  // 4. Profiles & Join
  console.log("\n4. Profiles & Relationships:");
  const { data: profileCols } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles Columns:", Object.keys(profileCols?.[0] || {}));
}

diagnose();
