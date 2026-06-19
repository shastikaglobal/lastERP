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

  console.log("Fetching QC-approved batches...");
  // Find batches that have an approved QC inspection
  const { data: qcRecords, error: qcErr } = await supabase
    .from('qc_inspections')
    .select('batch_id')
    .eq('company_id', companyId)
    .eq('result', 'approved')
    .limit(3);
    
  let batchIds = [];
  if (!qcErr && qcRecords && qcRecords.length > 0) {
    batchIds = qcRecords.map(qc => qc.batch_id);
  } else {
    console.log("No approved QC found, just picking any batch...");
    const { data: batches } = await supabase.from('inventory_batches').select('id').eq('company_id', companyId).limit(2);
    if (batches) batchIds = batches.map(b => b.id);
  }

  if (batchIds.length === 0) {
    console.error("No batches available to generate barcodes.");
    return;
  }

  console.log("Generating barcodes...");
  const barcodes = [];
  
  for (const batchId of batchIds) {
    // Generate a master batch barcode
    barcodes.push({
      company_id: companyId,
      batch_id: batchId,
      code: `MB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      level: 'batch',
      status: 'active',
      current_location: 'storage',
      scan_count: 0
    });
    
    // Generate 2 box barcodes for each batch
    for (let i = 1; i <= 2; i++) {
      barcodes.push({
        company_id: companyId,
        batch_id: batchId,
        box_number: i,
        code: `BX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        level: 'box',
        status: 'active',
        current_location: 'storage',
        scan_count: Math.floor(Math.random() * 5)
      });
    }
  }

  const { data, error } = await supabase.from('batch_barcodes').insert(barcodes).select();
  
  if (error) {
    console.error("Error creating barcodes:", error);
  } else {
    console.log(`Successfully generated ${data.length} barcodes!`, data.map(d => d.code));
  }
}

seed();
