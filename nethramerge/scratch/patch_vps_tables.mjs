import pg from 'pg';
import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new pg.Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432'),
  connectionTimeoutMillis: 8000,
});

async function run(sql, label) {
  try {
    await pool.query(sql);
    console.log(`✅ ${label}`);
  } catch (e) {
    console.error(`❌ ${label}: ${e.message}`);
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('  VPS DB — Patching 11 Empty Tables');
console.log('═══════════════════════════════════════════════════════\n');

// ── face_attendance ─────────────────────────────────────────
console.log('📋 face_attendance:');
await run(`ALTER TABLE face_attendance ADD COLUMN IF NOT EXISTS company_id uuid`, 'add company_id');
await run(`ALTER TABLE face_attendance ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false`, 'add is_deleted');
await run(`CREATE INDEX IF NOT EXISTS idx_face_attendance_employee ON face_attendance(employee_id)`, 'index employee_id');
await run(`CREATE INDEX IF NOT EXISTS idx_face_attendance_date ON face_attendance(date)`, 'index date');

// ── bills_of_lading ──────────────────────────────────────────
console.log('\n📋 bills_of_lading:');
await run(`ALTER TABLE bills_of_lading ADD COLUMN IF NOT EXISTS port_of_loading text`, 'add port_of_loading');
await run(`ALTER TABLE bills_of_lading ADD COLUMN IF NOT EXISTS port_of_discharge text`, 'add port_of_discharge');
await run(`ALTER TABLE bills_of_lading ADD COLUMN IF NOT EXISTS date_of_issue date`, 'add date_of_issue');
await run(`ALTER TABLE bills_of_lading ADD COLUMN IF NOT EXISTS consignee text`, 'add consignee');
await run(`ALTER TABLE bills_of_lading ADD COLUMN IF NOT EXISTS notify_party text`, 'add notify_party');
await run(`ALTER TABLE bills_of_lading ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'`, 'add status');
await run(`ALTER TABLE bills_of_lading ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false`, 'add is_deleted');
await run(`CREATE INDEX IF NOT EXISTS idx_bol_shipment ON bills_of_lading(shipment_id)`, 'index shipment_id');

// ── packing_lists ────────────────────────────────────────────
console.log('\n📋 packing_lists:');
await run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'`, 'add status');
await run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS net_weight numeric`, 'add net_weight');
await run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS gross_weight numeric`, 'add gross_weight');
await run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS packing_type text`, 'add packing_type');
await run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS marks_and_numbers text`, 'add marks_and_numbers');
await run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS created_by uuid`, 'add created_by');
await run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false`, 'add is_deleted');
await run(`CREATE INDEX IF NOT EXISTS idx_packing_lists_shipment ON packing_lists(shipment_id)`, 'index shipment_id');

// ── journal_entries ──────────────────────────────────────────
console.log('\n📋 journal_entries:');
await run(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id uuid`, 'add company_id');
await run(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'`, 'add status');
await run(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`, 'add updated_at');
await run(`CREATE INDEX IF NOT EXISTS idx_journal_company ON journal_entries(company_id)`, 'index company_id');
await run(`CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(entry_date)`, 'index entry_date');

// ── warehouse_stock ──────────────────────────────────────────
console.log('\n📋 warehouse_stock:');
await run(`ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS unit text DEFAULT 'kg'`, 'add unit');
await run(`ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS batch_id uuid`, 'add batch_id');
await run(`ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS min_stock_level numeric DEFAULT 0`, 'add min_stock_level');
await run(`ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS location text`, 'add location');
await run(`CREATE INDEX IF NOT EXISTS idx_wstock_warehouse ON warehouse_stock(warehouse_id)`, 'index warehouse_id');
await run(`CREATE INDEX IF NOT EXISTS idx_wstock_company ON warehouse_stock(company_id)`, 'index company_id');

// ── emails ───────────────────────────────────────────────────
console.log('\n📋 emails:');
await run(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS from_address text`, 'add from_address');
await run(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false`, 'add is_starred');
await run(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false`, 'add is_read');
await run(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS folder text DEFAULT 'inbox'`, 'add folder');
await run(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS zoho_message_id text`, 'add zoho_message_id');
await run(`CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id)`, 'index account_id');
await run(`CREATE INDEX IF NOT EXISTS idx_emails_company ON emails(company_id)`, 'index company_id');
await run(`CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder)`, 'index folder');

// ── zoho_accounts ─────────────────────────────────────────────
console.log('\n📋 zoho_accounts:');
await run(`ALTER TABLE zoho_accounts ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true`, 'add is_active');
await run(`ALTER TABLE zoho_accounts ADD COLUMN IF NOT EXISTS account_name text`, 'add account_name');
await run(`CREATE INDEX IF NOT EXISTS idx_zoho_company ON zoho_accounts(company_id)`, 'index company_id');
await run(`CREATE INDEX IF NOT EXISTS idx_zoho_user ON zoho_accounts(user_id)`, 'index user_id');

// ── meetings ─────────────────────────────────────────────────
console.log('\n📋 meetings:');
await run(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false`, 'add is_deleted');
await run(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_by uuid`, 'add created_by');
await run(`CREATE INDEX IF NOT EXISTS idx_meetings_company ON meetings(company_id)`, 'index company_id');
await run(`CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date)`, 'index meeting_date');
await run(`CREATE INDEX IF NOT EXISTS idx_meetings_host ON meetings(host_id)`, 'index host_id');

// ── farms ─────────────────────────────────────────────────────
console.log('\n📋 farms:');
await run(`ALTER TABLE farms ADD COLUMN IF NOT EXISTS village text`, 'add village');
await run(`ALTER TABLE farms ADD COLUMN IF NOT EXISTS district text`, 'add district');
await run(`ALTER TABLE farms ADD COLUMN IF NOT EXISTS state text`, 'add state');
await run(`ALTER TABLE farms ADD COLUMN IF NOT EXISTS soil_type text`, 'add soil_type');
await run(`ALTER TABLE farms ADD COLUMN IF NOT EXISTS irrigation_type text`, 'add irrigation_type');
await run(`CREATE INDEX IF NOT EXISTS idx_farms_farmer ON farms(farmer_id)`, 'index farmer_id');
await run(`CREATE INDEX IF NOT EXISTS idx_farms_company ON farms(company_id)`, 'index company_id');

// ── suppliers ─────────────────────────────────────────────────
console.log('\n📋 suppliers:');
await run(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_id uuid`, 'add company_id');
await run(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address text`, 'add address');
await run(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS gst_number text`, 'add gst_number');
await run(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_details jsonb`, 'add bank_details');
await run(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms text`, 'add payment_terms');
await run(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0`, 'add credit_limit');
await run(`CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id)`, 'index company_id');

// ── sales_orders ──────────────────────────────────────────────
console.log('\n📋 sales_orders:');
await run(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'`, 'add items');
await run(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0`, 'add tax_amount');
await run(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0`, 'add discount_amount');
await run(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS notes text`, 'add notes');
await run(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shipping_address text`, 'add shipping_address');
await run(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending'`, 'add payment_status');
await run(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS created_by uuid`, 'add created_by');
await run(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`, 'add updated_at');
await run(`CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON sales_orders(company_id)`, 'index company_id');
await run(`CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id)`, 'index customer_id');
await run(`CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status)`, 'index status');

// ── Final count check ─────────────────────────────────────────
console.log('\n\n📊 Final row counts for patched tables:');
const targets = ['face_attendance','bills_of_lading','packing_lists','journal_entries',
  'warehouse_stock','emails','zoho_accounts','meetings','farms','suppliers','sales_orders'];

for (const t of targets) {
  const { rows } = await pool.query(`SELECT COUNT(*) FROM "${t}"`);
  console.log(`   ${t.padEnd(22)} ${rows[0].count} rows`);
}

console.log('\n✅ All tables patched with missing columns and indexes.\n');
await pool.end();
