require('dotenv').config();
const db = require('./db');

async function migrate() {
  try {
    console.log("Starting CRM schema migration...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS follow_ups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        company_name TEXT,
        contact_name TEXT,
        follow_up_date DATE,
        note TEXT,
        assigned_to TEXT,
        is_notified BOOLEAN DEFAULT false,
        reminder_time TIME,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_number SERIAL,
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        company_id UUID,
        title TEXT NOT NULL,
        priority TEXT,
        status TEXT,
        due_date TIMESTAMP WITH TIME ZONE,
        assigned_to TEXT,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type TEXT,
        completed BOOLEAN DEFAULT false,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lead_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type TEXT,
        completed BOOLEAN DEFAULT false,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS quotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_number TEXT NOT NULL,
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        customer_id UUID,
        status TEXT DEFAULT 'Draft',
        amount NUMERIC,
        currency TEXT,
        date DATE,
        valid_until DATE,
        subtotal NUMERIC,
        tax_amount NUMERIC,
        discount_amount NUMERIC,
        terms TEXT,
        notes TEXT,
        created_by TEXT,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS quotation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
        product_id UUID,
        description TEXT,
        quantity NUMERIC NOT NULL,
        unit_price NUMERIC NOT NULL,
        total NUMERIC NOT NULL,
        tax_rate NUMERIC,
        discount NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("✅ Successfully created follow_ups, crm_tasks, lead_activities, quotations, quotation_items tables with Foreign Keys!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
