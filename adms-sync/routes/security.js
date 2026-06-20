const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/security/subnets
router.get('/subnets', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = 'SELECT * FROM corporate_subnets WHERE is_deleted = false';
    let params = [];
    if (company_id) {
      query += ' AND company_id = $1';
      params.push(company_id);
    }
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("DB Error (get subnets):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/security/subnets
router.post('/subnets', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const columns = Object.keys(data).filter(k => data[k] !== undefined);
    const values = columns.map(k => data[k]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await db.query(
      `INSERT INTO corporate_subnets (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("DB Error (create subnet):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/security/subnets/:id
router.delete('/subnets/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE corporate_subnets SET is_deleted = true, deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete subnet):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/security/logs
router.get('/logs', requireAuth, async (req, res) => {
  try {
    // Audit logs for security
    let query = `
      SELECT id, action, resource_type, user_agent, timestamp, status 
      FROM audit_logs 
      WHERE resource_type = 'security' AND is_deleted = false 
      ORDER BY timestamp DESC LIMIT 20
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error("DB Error (get security logs):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
