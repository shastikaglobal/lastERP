import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      return [key, val];
    })
);

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

async function deleteAllQuotations() {
  try {
    console.log('🗑️  Starting to delete all quotations...');

    // 1. Get all quotations
    const { data: quotations, error: fetchErr } = await supabase
      .from('quotations')
      .select('id');

    if (fetchErr) throw fetchErr;

    if (!quotations || quotations.length === 0) {
      console.log('✅ No quotations found to delete');
      return;
    }

    console.log(`📋 Found ${quotations.length} quotations to delete`);

    // 2. Delete all quotation items first (foreign key constraint)
    const { error: itemsErr } = await supabase
      .from('quotation_items')
      .delete()
      .not('quotation_id', 'is', null);

    if (itemsErr) throw itemsErr;
    console.log('✅ Deleted all quotation items');

    // 3. Delete all quotations
    const { error: quotationsErr } = await supabase
      .from('quotations')
      .delete()
      .not('id', 'is', null);

    if (quotationsErr) throw quotationsErr;
    console.log(`✅ Deleted all ${quotations.length} quotations`);

    console.log('✅ All quotation data has been removed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

deleteAllQuotations();
