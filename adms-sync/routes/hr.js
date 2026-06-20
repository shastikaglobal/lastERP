const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const HR_TABLES = [
  'attendance_logs',
  'profiles'
];

const isValidTable = (table) => HR_TABLES.includes(table);

// GET /api/hr/:table
router.get('/:table', requireAuth, async (req, res) => {
  const { table } = req.params;
  if (!isValidTable(table)) return res.status(400).json({ error: "Invalid table" });

  try {
    let query = `SELECT * FROM ${table}`;
    const values = [];
    const conditions = [];

    // Apply query parameters as filters
    Object.keys(req.query).forEach((key, index) => {
      conditions.push(`"${key}" = $${index + 1}`);
      values.push(req.query[key]);
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

// POST /api/hr/:table
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

// PUT /api/hr/:table/:id
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

module.exports = router;
