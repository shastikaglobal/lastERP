import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sxebygxpjzntogzpjnga.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrigger() {
  console.log("Fetching an existing batch to test...");
  const { data: batches } = await supabase.from('inventory_batches').select('id, company_id').limit(1);
  
  if (!batches || batches.length === 0) {

      console.log("No batches found.");
      return;
  }
  
  const testBatch = batches[0];
  
  console.log("Setting the test batch status to 'quarantined'...");
  await supabase.from('inventory_batches').update({ status: 'quarantined' }).eq('id', testBatch.id);

  console.log("Creating pending QC inspection for this batch...");
  const { data: newQc, error: qcErr } = await supabase.from('qc_inspections').insert([{
      company_id: testBatch.company_id,
      batch_id: testBatch.id,
      inspected_at: new Date().toISOString(),
      result: 'pending',
      grade: 'A',
      lab_notes: "Test trigger pending"
  }]).select().single();

  if (qcErr) { console.error("QC error:", qcErr); return; }
  
  // check batch status before
  let { data: batchBefore } = await supabase.from('inventory_batches').select('status').eq('id', testBatch.id).single();
  console.log("Batch status BEFORE approval:", batchBefore?.status);
  
  console.log("Approving QC inspection...");
  await supabase.from('qc_inspections').update({ result: 'approved' }).eq('id', newQc.id);
  
  // check batch status after
  let { data: batchAfter } = await supabase.from('inventory_batches').select('status').eq('id', testBatch.id).single();
  console.log("Batch status AFTER approval:", batchAfter?.status);
  
  if (batchAfter?.status === 'approved') {
    console.log("✅ SUCCESS! The database trigger worked and flipped the batch from quarantined to approved.");
  } else {
    console.log("❌ FAILED! The database trigger did NOT update the batch status.");
  }
}

testTrigger();
