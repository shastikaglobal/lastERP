const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const ORDER_COLUMNS = new Set([
  'company_id',
  'order_number',
  'customer_name',
  'customer_email',
  'customer_country',
  'customer_phone',
  'customer_gst',
  'product',
  'quantity',
  'unit',
  'unit_price',
  'total_amount',
  'currency',
  'status',
  'payment_status',
  'order_date',
  'expected_delivery',
  'shipping_address',
  'notes',
  'created_by',
  'hsn_code',
  'packing_details',
  'payment_terms',
  'incoterms',
  'net_weight',
  'gross_weight',
  'mode_of_transport',
  'total_cartons',
  'unit_net_weight',
  'country_of_origin',
  'port_of_loading',
  'port_of_discharge',
  'container_type',
  'loading_type',
  'qty_per_carton',
  'gross_weight_per_carton',
  'total_net_weight',
  'total_gross_weight',
  'bank_name',
  'bank_branch',
  'account_no',
  'ifsc_code',
  'swift_code',
]);

function pickOrderFields(body) {
  const data = {};
  for (const [key, value] of Object.entries(body)) {
    if (ORDER_COLUMNS.has(key) && value !== undefined) {
      data[key] = value;
    }
  }
  return data;
}

// GET /api/orders
router.get('/', requireAuth, async (req, res) => {
  try {
    const conditions = ['(is_deleted = false OR is_deleted IS NULL)'];
    const values = [];

    if (req.query.company_id) {
      values.push(req.query.company_id);
      conditions.push(`company_id = $${values.length}`);
    }
    if (req.query.payment_status) {
      values.push(req.query.payment_status);
      conditions.push(`payment_status = $${values.length}`);
    }
    if (req.query.status) {
      values.push(req.query.status);
      conditions.push(`status = $${values.length}`);
    }

    const { rows } = await db.query(
      `SELECT * FROM export_orders WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error('DB Error (get orders):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// GET /api/orders/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM export_orders WHERE id = $1 AND (is_deleted = false OR is_deleted IS NULL)`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('DB Error (get order):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/orders
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pickOrderFields(req.body);
    if (!data.company_id) {
      return res.status(400).json({ error: 'company_id is required' });
    }
    if (!data.order_number) {
      const year = new Date().getFullYear();
      const countRes = await db.query(
        `SELECT COUNT(id) AS count FROM export_orders WHERE company_id = $1 AND order_number ILIKE $2`,
        [data.company_id, `EXP-${year}-%`]
      );
      const nextNum = (parseInt(countRes.rows[0].count, 10) + 1).toString().padStart(3, '0');
      data.order_number = `EXP-${year}-${nextNum}`;
    }

    const keys = Object.keys(data);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => data[k]);

    const { rows } = await db.query(
      `INSERT INTO export_orders (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB Error (create order):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// PUT /api/orders/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = pickOrderFields(req.body);
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return res.json({ success: true });
    }

    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map((k) => data[k]);
    values.push(req.params.id);

    const { rows } = await db.query(
      `UPDATE export_orders SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('DB Error (update order):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// DELETE /api/orders/:id (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE export_orders SET is_deleted = true, deleted_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DB Error (delete order):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

module.exports = router;
