import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('═══════════════════════════════════════════════════════════');
console.log('  Supabase (Cloud) DB — Live Table Snapshot');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  URL: ${env.VITE_SUPABASE_URL}\n`);

// List of all key tables to check
const tables = [
  'profiles', 'companies', 'roles', 'user_roles', 'user_permissions', 'permissions',
  'leads', 'follow_ups', 'crm_tasks', 'call_logs',
  'products', 'customers', 'quotations', 'quotation_items',
  'export_orders', 'export_shipments', 'export_containers', 'shipment_dispatches',
  'inventory_batches', 'available_stock', 'reserved_stock', 'damaged_stock',
  'purchase_orders', 'purchase_order_items',
  'invoices', 'payments', 'chart_of_accounts', 'journal_entries',
  'warehouses', 'warehouse_stock',
  'emails', 'zoho_accounts', 'email_templates',
  'farmers', 'parties',
  'qc_inspections', 'packing_protocols', 'packing_lists',
  'vehicles', 'drivers',
  'attendance_logs', 'user_sessions', 'activity_logs',
  'notifications', 'app_notifications',
];

const results = [];

for (const table of tables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      results.push({ table, count: null, status: `❌ ${error.message.substring(0, 50)}` });
    } else {
      results.push({ table, count: count ?? 0, status: '✅' });
    }
  } catch (e) {
    results.push({ table, count: null, status: `❌ ${e.message}` });
  }
}

// Print results
console.log('   TABLE                        ROWS    STATUS');
console.log('   ─────────────────────────────────────────────────────');

let totalRows = 0;
let totalTables = 0;
let errorTables = 0;

for (const r of results) {
  const name = r.table.padEnd(30);
  if (r.count !== null) {
    const rows = String(r.count).padStart(6);
    console.log(`   ${name} ${rows}  ${r.status}`);
    totalRows += r.count;
    totalTables++;
  } else {
    console.log(`   ${name}  (N/A)  ${r.status}`);
    errorTables++;
  }
}

console.log('   ─────────────────────────────────────────────────────');
console.log(`\n📊 Summary: ${totalTables} tables accessible, ${errorTables} errors`);
console.log(`📦 Total rows across all tables: ${totalRows.toLocaleString()}`);

// Check recently active tables
console.log('\n\n🔍 Spot-Check Recent Records:');

// Recent emails
const { data: recentEmails } = await supabase.from('emails').select('id, subject, status, created_at').order('created_at', { ascending: false }).limit(3);
if (recentEmails?.length) {
  console.log('\n📧 Last 3 Emails:');
  recentEmails.forEach(e => console.log(`   [${e.status}] ${e.subject || '(no subject)'} — ${new Date(e.created_at).toLocaleString('en-IN')}`));
}

// Recent leads
const { data: recentLeads } = await supabase.from('leads').select('id, company_name, stage, created_at').order('created_at', { ascending: false }).limit(3);
if (recentLeads?.length) {
  console.log('\n🤝 Last 3 Leads:');
  recentLeads.forEach(l => console.log(`   [${l.stage}] ${l.company_name || 'N/A'} — ${new Date(l.created_at).toLocaleString('en-IN')}`));
}

// Recent quotations
const { data: recentQuotes } = await supabase.from('quotations').select('id, quotation_number, status, created_at').order('created_at', { ascending: false }).limit(3);
if (recentQuotes?.length) {
  console.log('\n📄 Last 3 Quotations:');
  recentQuotes.forEach(q => console.log(`   [${q.status}] ${q.quotation_number || q.id} — ${new Date(q.created_at).toLocaleString('en-IN')}`));
}

// Profiles
const { data: profileList } = await supabase.from('profiles').select('id, full_name, email, requested_role, is_active').order('created_at', { ascending: false });
if (profileList?.length) {
  console.log(`\n👥 All Profiles (${profileList.length}):`);
  profileList.forEach(p => console.log(`   ${p.is_active ? '🟢' : '🔴'} ${p.full_name || 'N/A'} <${p.email}> — ${p.requested_role || 'no role'}`));
}

console.log('\n✅ Supabase DB check complete.\n');
