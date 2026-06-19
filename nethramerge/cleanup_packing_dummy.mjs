import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDummyPackingData() {
  try {
    console.log('🧹 Starting cleanup of dummy packing data...\n');

    // Get all packing protocols
    const { data: allPackings, error: fetchError } = await supabase
      .from('packing_protocols')
      .select('id, receiving_id, status, created_at');

    if (fetchError) {
      console.error('❌ Error fetching packing data:', fetchError);
      process.exit(1);
    }

    console.log(`📊 Total packing records found: ${allPackings?.length || 0}\n`);

    // Filter dummy data - common patterns for dummy data:
    // - receiving_id is just numbers like "5678"
    // - receiving_id contains "test", "dummy", "demo"
    // - receiving_id is very short (less than 4 chars) and numeric
    const dummyRecords = (allPackings || []).filter(p => {
      const id = p.receiving_id?.toLowerCase() || '';
      return (
        id === '5678' ||
        id === 'test' ||
        id === 'dummy' ||
        id === 'demo' ||
        id.includes('dummy') ||
        id.includes('test') ||
        (id.match(/^\d+$/) && id.length <= 4) // numeric IDs with 4 or fewer digits
      );
    });

    if (dummyRecords.length === 0) {
      console.log('✅ No dummy packing data found. Database is clean!');
      process.exit(0);
    }

    console.log(`🗑️  Found ${dummyRecords.length} dummy packing record(s):\n`);
    dummyRecords.forEach((record, idx) => {
      console.log(`  ${idx + 1}. Receiving ID: ${record.receiving_id} | Status: ${record.status} | Created: ${new Date(record.created_at).toLocaleString()}`);
    });

    console.log('\n⚠️  Proceeding to delete dummy records...\n');

    // Delete dummy records
    for (const record of dummyRecords) {
      const { error: deleteError } = await supabase
        .from('packing_protocols')
        .delete()
        .eq('id', record.id);

      if (deleteError) {
        console.error(`❌ Error deleting record ${record.id}:`, deleteError);
      } else {
        console.log(`✅ Deleted: Receiving ID ${record.receiving_id} (${record.id})`);
      }
    }

    console.log(`\n🎉 Cleanup complete! Deleted ${dummyRecords.length} dummy record(s).`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

cleanupDummyPackingData();
