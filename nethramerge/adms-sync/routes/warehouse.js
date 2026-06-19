const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const WAREHOUSE_TABLES = [
  'warehouses',
  'warehouse_locations',
  'receiving_goods',
  'packing_protocols'
];

const isValidTable = (table) => WAREHOUSE_TABLES.includes(table);

// GET /api/warehouse/with-stock
router.get('/with-stock', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT w.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'quantity_remaining_kg', ib.quantity_remaining_kg,
              'product', json_build_object('category', p.category)
            )
          ) FILTER (WHERE ib.id IS NOT NULL), '[]'
        ) as inventory_batches
      FROM warehouses w
      LEFT JOIN inventory_batches ib ON w.id = ib.warehouse_id AND (ib.is_deleted = false OR ib.is_deleted IS NULL)
      LEFT JOIN products p ON ib.product_id = p.id
      WHERE (w.is_deleted = false OR w.is_deleted IS NULL)
      GROUP BY w.id
      ORDER BY w.name
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Error GET warehouses with stock:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const hasDeletedColCache = {};

// GET /api/warehouse/:table
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

// POST /api/warehouse/:table
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
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/warehouse/:table/:id
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
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/warehouse/:table/:id
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
