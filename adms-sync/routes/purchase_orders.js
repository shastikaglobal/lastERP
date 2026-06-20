const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/purchase_orders
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT po.*, json_build_object('full_name', f.full_name) as farmers 
       FROM purchase_orders po
       LEFT JOIN farmers f ON po.farmer_id = f.id
       WHERE po.is_deleted IS NOT TRUE
       ORDER BY po.order_date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('DB Error (get purchase orders):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/purchase_orders
router.post('/', requireAuth, async (req, res) => {
  try {
    const { company_id, po_number, farmer_id, status, order_date, total, currency } = req.body;
    
    if (!company_id || !farmer_id) {
      return res.status(400).json({ error: 'company_id and farmer_id are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO purchase_orders (company_id, po_number, farmer_id, status, order_date, total, currency, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false) RETURNING *`,
      [company_id, po_number, farmer_id, status || 'draft', order_date, total, currency || 'INR']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB Error (create purchase order):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// DELETE /api/purchase_orders/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE purchase_orders SET is_deleted = true, deleted_at = NOW(), deleted_by = $1 WHERE id = $2 RETURNING id`,
      [req.user?.id || null, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DB Error (delete purchase order):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

module.exports = router;
