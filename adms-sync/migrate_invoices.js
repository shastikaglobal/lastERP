require('dotenv').config();
const db = require('./db');

async function migrate() {
  try {
    console.log('Starting Invoices schema migration...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number TEXT,
        company_id UUID,
        customer_name TEXT,
        customer_address TEXT,
        customer_phone TEXT,
        customer_email TEXT,
        currency TEXT DEFAULT 'USD',
        amount NUMERIC,
        status TEXT DEFAULT 'Draft',
        notes TEXT,
        created_by TEXT,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
        description TEXT,
        product_id UUID,
        quantity NUMERIC DEFAULT 1,
        unit_price NUMERIC DEFAULT 0,
        total_price NUMERIC DEFAULT 0,
        hsn_code TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✅ invoices and invoice_items tables created');
  } catch (err) {
    console.error('Invoice migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
