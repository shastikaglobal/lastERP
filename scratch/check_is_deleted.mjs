import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  "export_containers",
  "export_shipments",
  "export_orders",
  "quotations",
  "qc_inspections",
  "inventory_movements",
  "inventory_batches",
  "purchase_order_items",
  "purchase_orders",
  "leads",
  "farmers",
  "suppliers",
  "customers",
  "user_roles"
];

async function checkColumns() {
  console.log("Checking columns for tables...");
  for (const table of tables) {
    // We can try to select one row or schema info
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table [${table}] select error: ${error.message}`);
    } else {
      const row = data && data[0] ? data[0] : {};
      const hasIsDeleted = 'is_deleted' in row;
      console.log(`Table [${table}]: ${hasIsDeleted ? '✅ Has' : '❌ DOES NOT HAVE'} is_deleted column`);
      
      // Let's also check if we can query the actual columns by selecting a dummy or checking the keys
      // If row is empty, we don't get keys, but we can do a mock update to see if it throws is_deleted error.
      if (data && data.length === 0) {
        // Run a mock update that matches no rows to see if the column exists
        const { error: updError } = await supabase.from(table).update({ is_deleted: false }).eq('id', '00000000-0000-0000-0000-000000000000');
        if (updError) {
          if (updError.message.includes('column') && updError.message.includes('does not exist')) {
            console.log(`   └─ mock update confirmation: ❌ DOES NOT HAVE is_deleted`);
          } else {
            console.log(`   └─ mock update msg: ${updError.message}`);
          }
        } else {
          console.log(`   └─ mock update confirmation: ✅ Has is_deleted (update succeeded with 0 rows)`);
        }
      }
    }
  }
}

checkColumns();
