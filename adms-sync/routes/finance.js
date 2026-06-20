const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const FINANCE_TABLES = [
  'payments',
  'journal_entries',
  'journal_entry_rows',
  'chart_of_accounts',
  'parties',
  'gst_transactions',
  'sales_orders',
  'purchase_orders',
  'customers',
  'suppliers',
  'farmers',
  'export_orders',
  'export_shipments',
  'export_containers',
  'shipping_carriers',
  'shipping_ports',
  'container_types'
];

const isValidTable = (table) => FINANCE_TABLES.includes(table);

// GET /api/finance/counts (custom endpoint for Tally counts)
router.get('/counts', requireAuth, async (req, res) => {
  try {
    const { rows: journalRows } = await db.query("SELECT status, count(*) as count FROM journal_entries WHERE is_deleted = false OR is_deleted IS NULL GROUP BY status");
    const { rows: coaRows } = await db.query("SELECT count(*) as count FROM chart_of_accounts WHERE status = 'Active' AND (is_deleted = false OR is_deleted IS NULL)");
    const { rows: partyRows } = await db.query("SELECT type, count(*) as count FROM parties WHERE is_deleted = false OR is_deleted IS NULL GROUP BY type");

    res.json({
      journal_entries: journalRows,
      chart_of_accounts: coaRows,
      parties: partyRows
    });
  } catch (err) {
    console.error("Error GET /api/finance/counts:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/finance/reports/ar_aging
router.get('/reports/ar_aging', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT so.order_number, so.amount, so.currency, so.delivery_date, 
             json_build_object('name', c.name) as customer
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE (so.is_deleted = false OR so.is_deleted IS NULL) AND so.status = 'Pending'
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Error GET AR Aging:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/finance/reports/cash_flow
router.get('/reports/cash_flow', requireAuth, async (req, res) => {
  try {
    const qInflow = `
      SELECT p.payment_number, p.amount, p.currency, p.received_at, 
             json_build_object('name', c.name) as customer
      FROM payments p
      LEFT JOIN customers c ON p.payer_id = c.id
      WHERE (p.is_deleted = false OR p.is_deleted IS NULL) AND p.status = 'Completed'
    `;
    const { rows: inflow } = await db.query(qInflow);

    const qOutflow = `
      SELECT po.po_number, po.total, po.currency, po.order_date, 
             json_build_object('full_name', f.full_name) as farmer
      FROM purchase_orders po
      LEFT JOIN farmers f ON po.farmer_id = f.id
      WHERE (po.is_deleted = false OR po.is_deleted IS NULL) AND po.status IN ('approved', 'received')
    `;
    const { rows: outflow } = await db.query(qOutflow);

    res.json({ inflow, outflow });
  } catch (err) {
    console.error("Error GET Cash Flow:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const hasDeletedColCache = {};

// GET /api/finance/:table
router.get('/:table', requireAuth, async (req, res) => {
  const { table } = req.params;
  if (!isValidTable(table)) return res.status(400).json({ error: "Invalid table" });

  try {
    let query = `SELECT * FROM ${table}`;
    const values = [];
    const conditions = [];

    if (hasDeletedColCache[table] === undefined) {
      const colCheck = await db.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'is_deleted'",
        [table]
      );
      hasDeletedColCache[table] = colCheck.rows.length > 0;
    }

    if (hasDeletedColCache[table]) {
      conditions.push("(is_deleted = false OR is_deleted IS NULL)");
    }

    Object.keys(req.query).forEach((key) => {
      values.push(req.query[key]);
      conditions.push(`"${key}" = $${values.length}`);
    });

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    const { rows } = await db.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error(`Error GET ${table}:`, err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/finance/:table
router.post('/:table', requireAuth, async (req, res) => {
  const { table } = req.params;
  if (!isValidTable(table)) return res.status(400).json({ error: "Invalid table" });

  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (data.length === 0) return res.status(400).json({ error: "Empty payload" });

    const keys = Object.keys(data[0]).filter(k => k !== 'id');
    const cols = keys.map(k => `"${k}"`).join(', ');
    
    const results = [];
    for (const item of data) {
      const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => item[k]);
      const { rows } = await db.query(`INSERT INTO ${table} (${cols}) VALUES (${vals}) RETURNING *`, values);
      results.push(rows[0]);
    }
    
    res.status(201).json(Array.isArray(req.body) ? results : results[0]);
  } catch (err) {
    console.error(`Error POST ${table}:`, err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/finance/:table/:id
router.put('/:table/:id', requireAuth, async (req, res) => {
  const { table, id } = req.params;
  if (!isValidTable(table)) return res.status(400).json({ error: "Invalid table" });

  try {
    const data = req.body;
    const keys = Object.keys(data).filter(k => k !== 'id');
    if (keys.length === 0) return res.json({ success: true });

    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map(k => data[k]);
    values.push(id);

    await db.query(`UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1}`, values);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error PUT ${table}:`, err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/finance/:table/:id (Soft/Hard delete)
router.delete('/:table/:id', requireAuth, async (req, res) => {
  const { table, id } = req.params;
  if (!isValidTable(table)) return res.status(400).json({ error: "Invalid table" });

  try {
    if (hasDeletedColCache[table] === undefined) {
      const colCheck = await db.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'is_deleted'",
        [table]
      );
      hasDeletedColCache[table] = colCheck.rows.length > 0;
    }

    if (hasDeletedColCache[table]) {
      await db.query(`UPDATE ${table} SET is_deleted = true WHERE id = $1`, [id]);
    } else {
      await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`Error DELETE ${table}:`, err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

