const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/customers?company_id=...
router.get('/', requireAuth, async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (companyId) {
      const { rows } = await db.query('SELECT * FROM customers WHERE company_id = $1 AND is_deleted IS NOT TRUE ORDER BY name', [companyId]);
      return res.json(rows);
    }
    const { rows } = await db.query('SELECT * FROM customers WHERE is_deleted IS NOT TRUE ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('DB Error (get customers):', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/customers/find-or-create
router.post('/find-or-create', requireAuth, async (req, res) => {
  try {
    const { company_id, name, address, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { rows: existing } = await db.query('SELECT id FROM customers WHERE company_id = $1 AND name = $2 LIMIT 1', [company_id, name]);
    if (existing.length > 0) {
      return res.json({ id: existing[0].id });
    }

    const { rows } = await db.query(
      'INSERT INTO customers (company_id, name, address, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [company_id || null, name, address || null, phone || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB Error (find-or-create customer):', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, email, phone, relationship_status, satisfaction_notes, satisfaction_score, repeat_order_count } = req.body;
    
    const { rows } = await db.query(
      `UPDATE customers SET 
        name = COALESCE($1, name),
        country = COALESCE($2, country),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        relationship_status = COALESCE($5, relationship_status),
        satisfaction_notes = COALESCE($6, satisfaction_notes),
        satisfaction_score = COALESCE($7, satisfaction_score),
        repeat_order_count = COALESCE($8, repeat_order_count),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, country, email, phone, relationship_status, satisfaction_notes, satisfaction_score, repeat_order_count, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('DB Error (put customer):', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { satisfaction_notes } = req.body;
    
    const { rows } = await db.query(
      `UPDATE customers SET 
        satisfaction_notes = COALESCE($1, satisfaction_notes),
        updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [satisfaction_notes, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('DB Error (patch customer):', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
