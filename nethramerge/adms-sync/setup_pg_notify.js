const db = require('./db');

const tables = [
  'leads',
  'customers',
  'products',
  'quotations',
  'export_orders',
  'profiles',
  'inventory_batches',
  'invoices',
  'follow_ups',
  'crm_tasks',
  'companies',
  'hr&employees'
];

async function setup() {
  console.log('🏁 Starting PostgreSQL NOTIFY trigger setup...');
  try {
    // 1. Create the notify function
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION notify_data_change()
      RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify('data_changed', TG_TABLE_NAME);
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;
    await db.query(createFunctionSql);
    console.log('✅ Created trigger function notify_data_change()');

    // 2. Apply triggers to each table
    for (const table of tables) {
      const triggerName = `${table.replace('&', '_')}_notify_trigger`;
      
      // Drop trigger if exists
      await db.query(`DROP TRIGGER IF EXISTS "${triggerName}" ON "${table}";`);
      
      // Create new trigger
      const createTriggerSql = `
        CREATE TRIGGER "${triggerName}"
        AFTER INSERT OR UPDATE OR DELETE ON "${table}"
        FOR EACH ROW
        EXECUTE FUNCTION notify_data_change();
      `;
      await db.query(createTriggerSql);
      console.log(`✅ Applied real-time trigger to table "${table}"`);
    }

    console.log('🎉 PostgreSQL NOTIFY triggers successfully set up!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up PostgreSQL NOTIFY triggers:', error);
    process.exit(1);
  }
}

setup();
