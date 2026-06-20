import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const env = dotenv.parse(readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function deletePackingLists() {
  // Delete all rows from packing_protocols
  const { data, error } = await supabase
    .from('packing_protocols')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // match all
    
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Successfully deleted all packing protocols.');
  }
}

deletePackingLists();
