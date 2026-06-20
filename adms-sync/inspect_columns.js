const db = require('./db');

async function run() {
  try {
    const tables = [
      'warehouses',
      'warehouse_locations',
      'receiving_goods',
      'inventory_batches',
      'reserved_stock',
      'damaged_stock',
      'export_ready_inventory',
      'expiry_monitoring',
      'warehouse_stock',
      'inventory_movements',
      'available_stock',
      'products'
    ];
    for (const t of tables) {
      const q = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${t}'`);
      const cols = q.rows.map(r=>r.column_name);
      console.log(`${t} has is_deleted:`, cols.includes('is_deleted'));
    }
  } catch (err) {
    console.error('inspect failed:', err);
  } finally {
    process.exit(0);
  }
}

run();



