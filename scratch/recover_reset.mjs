// ============================================================
// RECOVERY SCRIPT - Undo Factory Reset
// Restores all soft-deleted records (is_deleted = true -> false)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: join(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const softDeletedTables = [
  "export_shipments",
  "export_orders",
  "quotations",
  "inventory_batches",
  "purchase_orders",
  "leads",
  "farmers",
  "suppliers",
  "customers",
  "user_roles",
];

async function recoverTable(table) {
  console.log(`🔄 Recovering ${table}...`);
  const { data, error, count } = await supabase
    .from(table)
    .update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
    })
    .eq("is_deleted", true)
    .select("id");

  if (error) {
    console.error(`  ❌ Error recovering ${table}:`, error.message);
  } else {
    console.log(`  ✅ Restored ${data?.length ?? 0} records in ${table}`);
  }
}

async function main() {
  console.log("===========================================");
  console.log("  RECOVERY: Undoing Factory Reset");
  console.log("===========================================\n");

  for (const table of softDeletedTables) {
    await recoverTable(table);
  }

  console.log("\n===========================================");
  console.log("  ✅ Recovery complete!");
  console.log("  ⚠️  Note: Hard-deleted tables (export_containers,");
  console.log("     qc_inspections, inventory_movements,");
  console.log("     purchase_order_items) cannot be recovered.");
  console.log("===========================================");
}

main().catch(console.error);
