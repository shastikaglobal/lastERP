const db = require('./db');

async function run() {
  try {
    await db.query('BEGIN');

    // Ensure a customer exists
    let custRes = await db.query('SELECT id FROM customers LIMIT 1');
    let customerId;
    if (custRes.rows.length === 0) {
      const ins = await db.query("INSERT INTO customers (name, address, phone) VALUES ('Test Customer', 'Test Address', '000') RETURNING id");
      customerId = ins.rows[0].id;
    } else {
      customerId = custRes.rows[0].id;
    }

    // Ensure a product exists
    let prodRes = await db.query('SELECT id FROM products LIMIT 1');
    let productId;
    if (prodRes.rows.length === 0) {
      const pin = await db.query("INSERT INTO products (name, sku, unit) VALUES ('Test Product', 'TP-001', 'PCS') RETURNING id");
      productId = pin.rows[0].id;
    } else {
      productId = prodRes.rows[0].id;
    }

    // Ensure a company exists
    let compRes = await db.query('SELECT id FROM companies LIMIT 1');
    let companyId;
    if (compRes.rows.length === 0) {
      const cin = await db.query("INSERT INTO companies (name) VALUES ('Test Company') RETURNING id");
      companyId = cin.rows[0].id;
    } else {
      companyId = compRes.rows[0].id;
    }

    // Insert quotation
    const qnum = `QT-${new Date().getFullYear()}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
    const qIns = await db.query(
      `INSERT INTO quotations (company_id, quotation_number, customer_id, status, amount, subtotal, tax_amount, items_count, total_amount, created_by, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [companyId, qnum, customerId, 'Draft', 5000, 5000, 0, 1, 5000, null, 'USD']
    );
    const q = qIns.rows[0];

    // Insert item
    await db.query(
      `INSERT INTO quotation_items (quotation_id, product_id, product_name, description, quantity, unit_price, total_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [q.id, productId, 'Test Product', 'Test Product', 10, 500, 5000]
    );

    await db.query('COMMIT');

    console.log('Inserted quotation:', q);

    // Fetch back the quotation with items
    const res = await db.query('SELECT * FROM quotations WHERE id = $1', [q.id]);
    const items = await db.query('SELECT * FROM quotation_items WHERE quotation_id = $1', [q.id]);
    console.log('Quotation row:', res.rows[0]);
    console.log('Items:', items.rows);

    // Fire a manual pg_notify for visibility
    await db.query("SELECT pg_notify('data_changed','quotations')");
    console.log('pg_notify fired for quotations');

  } catch (err) {
    await db.query('ROLLBACK').catch(()=>{});
    console.error('Test insert failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
