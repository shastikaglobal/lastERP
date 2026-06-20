const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const INVENTORY_TABLES = [
  'inventory_batches',
  'reserved_stock',
  'damaged_stock',
  'export_ready_inventory',
  'expiry_monitoring',
  'warehouse_stock',
  'inventory_movements',
  'available_stock',
  'products',
  'warehouses',
  'qc_inspections'
];

// Helper to validate table name
const isValidTable = (table) => INVENTORY_TABLES.includes(table);

const hasDeletedColCache = {};

// GET /api/inventory/qc_inspections/with-batch — joined read for QC pages
router.get('/qc_inspections/with-batch', requireAuth, async (req, res) => {
  try {
    const companyId = req.query.company_id;
    const result = req.query.result; // optional filter e.g. 'pending'
    let query = `
      SELECT qi.*,
        ib.lot_number AS batch_lot_number,
        p.name AS product_name
      FROM qc_inspections qi
      LEFT JOIN inventory_batches ib ON qi.batch_id = ib.id
      LEFT JOIN products p ON ib.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND qi.company_id = $${params.length}`; }
    if (result) { params.push(result); query += ` AND qi.result = $${params.length}::qc_result`; }
    query += ` ORDER BY qi.inspected_at DESC NULLS LAST`;
    const { rows } = await db.query(query, params);
    // Map to Supabase-like nested structure for frontend compatibility
    const mapped = rows.map(r => ({
      ...r,
      batch: { lot_number: r.batch_lot_number, product: { name: r.product_name } }
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Error GET qc_inspections/with-batch:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/:table
router.get('/:table', requireAuth, async (req, res) => {
  const { table } = req.params;
  if (!isValidTable(table)) return res.status(400).json({ error: "Invalid table" });

  try {
    let query = `SELECT * FROM ${table}`;
    if (hasDeletedColCache[table] === undefined) {
      const colCheck = await db.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'is_deleted'",
        [table]
      );
      hasDeletedColCache[table] = colCheck.rows.length > 0;
    }

    if (hasDeletedColCache[table]) {
       query += " WHERE is_deleted = false OR is_deleted IS NULL";
    }
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error(`Error GET ${table}:`, err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/inventory/:table
router.post('/:table', requireAuth, async (req, res) => {
  const { table } = req.params;
  if (!isValidTable(table)) return res.status(400).json({ error: "Invalid table" });

  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (data.length === 0) return res.status(400).json({ error: "Empty payload" });

    const keys = Object.keys(data[0]).filter(k => k !== 'id');
    const cols = keys.map(k => `"${k}"`).join(', ');
    
    // We will do single insert for simplicity unless multiple
    const results = [];
    for (const item of data) {
      const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => item[k]);
      const { rows } = await db.query(`INSERT INTO ${table} (${cols}) VALUES (${vals}) RETURNING *`, values);
      results.push(rows[0]);
    }
    
    res.status(201).json(Array.isArray(req.body) ? results : results[0]);
  } catch (err) {
    console.error(`Error POST ${table}:`, err.message, err.detail || '');
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// PUT /api/inventory/:table/:id
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

// DELETE /api/inventory/:table/:id (Soft delete)
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
