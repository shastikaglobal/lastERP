const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../db');

// GET /api/crm-tasks
router.get('/', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;
    
    let query = `
      SELECT t.*, 
             p.full_name as profile_full_name, p.email as profile_email,
             l.company_name as lead_company_name
      FROM crm_tasks t
      LEFT JOIN profiles p ON t.assigned_to = p.id::text
      LEFT JOIN leads l ON t.lead_id = l.id
      WHERE t.is_deleted = false
    `;
    const params = [];
    
    if (company_id) {
      params.push(company_id);
      query += ` AND t.company_id = $1`;
    }
    
    query += ` ORDER BY t.created_at DESC`;
    
    const result = await db.query(query, params);
    
    const formatted = result.rows.map(row => {
      const { profile_full_name, profile_email, lead_company_name, ...task } = row;
      return {
        ...task,
        profiles: profile_full_name || profile_email ? { full_name: profile_full_name, email: profile_email } : null,
        leads: lead_company_name ? { company_name: lead_company_name } : null
      };
    });
    
    res.json(formatted);
  } catch (err) {
    console.error("DB Error (get tasks):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/crm-tasks
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    
    const columns = Object.keys(data).filter(k => data[k] !== undefined);
    const values = columns.map(k => data[k]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const result = await db.query(
      `INSERT INTO crm_tasks (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("DB Error (create task):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/crm-tasks/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({ success: true });

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
    values.push(req.params.id);

    await db.query(
      `UPDATE crm_tasks SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update task):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/crm-tasks/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE crm_tasks SET is_deleted = true, deleted_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete task):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
