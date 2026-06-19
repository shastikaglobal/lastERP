const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// ==========================================
// INVOICES
// ==========================================

// GET /api/invoices - Fetch all invoices
router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error("DB Error (get invoices):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/invoices/:id - Fetch single invoice + items
router.get('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: invoiceRows } = await db.query('SELECT * FROM invoices WHERE id = $1 LIMIT 1', [id]);
    if (invoiceRows.length === 0) return res.status(404).json({ error: "Invoice not found" });

    if (invoiceRows.length > 1) {
      console.warn(`Warning: multiple invoices returned for id=${id}, using the first row.`);
    }

    const { rows: itemRows } = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC', [id]);

    const invoice = invoiceRows[0];
    invoice.items = itemRows || [];

    res.json(invoice);
  } catch (err) {
    console.error("DB Error (get single invoice):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/invoices - Create invoice + items using Transaction
router.post('/invoices', requireAuth, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const invoiceData = req.body;
    const items = invoiceData.items || [];
    delete invoiceData.items;
    
    // Default created_by to logged in user if not provided
    if (!invoiceData.created_by) invoiceData.created_by = req.user.sub;
    
    const invKeys = Object.keys(invoiceData);
    const invPlaceholders = invKeys.map((_, i) => `$${i + 1}`).join(', ');
    const invColumns = invKeys.map(k => `"${k}"`).join(', ');
    const invValues = Object.values(invoiceData);
    
    const { rows: newInvoiceRows } = await client.query(
      `INSERT INTO invoices (${invColumns}) VALUES (${invPlaceholders}) RETURNING *`,
      invValues
    );
    const newInvoice = newInvoiceRows[0];
    
    const newItems = [];
    if (items.length > 0) {
      for (const item of items) {
        item.invoice_id = newInvoice.id;
        const itemKeys = Object.keys(item);
        const itemPlaceholders = itemKeys.map((_, i) => `$${i + 1}`).join(', ');
        const itemColumns = itemKeys.map(k => `"${k}"`).join(', ');
        const itemValues = Object.values(item);
        
        const { rows: insertedItem } = await client.query(
          `INSERT INTO invoice_items (${itemColumns}) VALUES (${itemPlaceholders}) RETURNING *`,
          itemValues
        );
        newItems.push(insertedItem[0]);
      }
    }
    
    await client.query('COMMIT');
    newInvoice.items = newItems;
    res.status(201).json(newInvoice);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("DB Error (create invoice):", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// PUT /api/invoices/:id - Update invoice
router.put('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ success: true });
    
    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    await db.query(`UPDATE invoices SET ${setClause} WHERE id = $1`, values);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update invoice):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM invoices WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete invoice):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ==========================================
// QUOTATIONS
// ==========================================

// GET /api/quotations - Fetch all quotations
router.get('/quotations', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT q.*, 
             c.name as customer_name, c.address as customer_address, c.phone as customer_phone,
             (SELECT json_agg(json_build_object(
                'id', qi.id, 'quantity', qi.quantity, 'unit_price', qi.unit_price, 'total_price', qi.total_price, 'hsn_code', qi.hsn_code,
                'product', json_build_object('name', p.name, 'sku', p.sku, 'unit', p.unit)
              ))
              FROM quotation_items qi
              LEFT JOIN products p ON qi.product_id = p.id
              WHERE qi.quotation_id = q.id) as items
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.is_deleted IS NOT TRUE
      ORDER BY q.created_at DESC
    `);
    
    const formatted = rows.map(r => ({
      ...r,
      customer: { name: r.customer_name, address: r.customer_address, phone: r.customer_phone },
      items: r.items || []
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error("DB Error (get quotations):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/quotations/:id - Fetch single quotation + items
router.get('/quotations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: quoteRows } = await db.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (quoteRows.length === 0) return res.status(404).json({ error: "Quotation not found" });
    
    const { rows: itemRows } = await db.query('SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY id ASC', [id]);
    
    const quote = quoteRows[0];
    quote.items = itemRows;
    
    res.json(quote);
  } catch (err) {
    console.error("DB Error (get single quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/quotations - Create quotation + items using Transaction
router.post('/quotations', requireAuth, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const quoteData = req.body;
    const items = quoteData.items || [];
    delete quoteData.items;
    
    // Default created_by to logged in user if not provided
    if (!quoteData.created_by) quoteData.created_by = req.user.sub;
    
    const keys = Object.keys(quoteData);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');
    const values = Object.values(quoteData);
    
    const { rows: newQuoteRows } = await client.query(
      `INSERT INTO quotations (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    const newQuote = newQuoteRows[0];
    
    const newItems = [];
    if (items.length > 0) {
      for (const item of items) {
        item.quotation_id = newQuote.id;
        const itemKeys = Object.keys(item);
        const itemPlaceholders = itemKeys.map((_, i) => `$${i + 1}`).join(', ');
        const itemColumns = itemKeys.map(k => `"${k}"`).join(', ');
        const itemValues = Object.values(item);
        
        const { rows: insertedItem } = await client.query(
          `INSERT INTO quotation_items (${itemColumns}) VALUES (${itemPlaceholders}) RETURNING *`,
          itemValues
        );
        newItems.push(insertedItem[0]);
      }
    }
    
    await client.query('COMMIT');
    newQuote.items = newItems;
    res.status(201).json(newQuote);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("DB Error (create quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// PUT /api/quotations/:id - Update quotation
router.put('/quotations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ success: true });
    
    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    await db.query(`UPDATE quotations SET ${setClause} WHERE id = $1`, values);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/quotations/:id - Delete quotation (soft delete)
router.delete('/quotations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE quotations SET is_deleted = true, deleted_at = $1 WHERE id = $2', [new Date().toISOString(), id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
