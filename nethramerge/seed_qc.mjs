import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seed() {
  console.log("Fetching a company...");
  const { data: companies, error: cErr } = await supabase.from('companies').select('id').limit(1);
  if (cErr || !companies.length) {
    console.error("No company found", cErr);
    return;
  }
  const companyId = companies[0].id;

  console.log("Fetching batches...");
  const { data: batches, error: bErr } = await supabase
    .from('inventory_batches')
    .select('id')
    .eq('company_id', companyId)
    .limit(3);
    
  if (bErr || !batches || batches.length === 0) {
    console.error("No batches found to attach QC to.", bErr);
    return;
  }

  console.log("Creating pending QC inspections...");
  const inspections = batches.map(b => ({
    company_id: companyId,
    batch_id: b.id,
    inspected_at: new Date().toISOString(),
    result: 'pending',
    grade: 'A',
    moisture_pct: 12.5,
    broken_pct: 2.1,
    foreign_matter_pct: 0.5,
    lab_notes: "Awaiting final lab sign-off. Visual inspection passed."
  }));

  const { data, error } = await supabase.from('qc_inspections').insert(inspections).select();
  
  if (error) {
    console.error("Error creating QC:", error);
  } else {
    console.log("Successfully created pending QC approvals!", data);
  }
}

seed();
