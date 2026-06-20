const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/documents/certificates
router.get('/certificates', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM certificates_of_origin WHERE is_deleted = false ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /api/documents/certificates:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/documents/certificates
router.post('/certificates', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const {
      company_id, ref_number, consignee_name, consignee_address,
      vessel, port_of_loading, port_of_discharge, marks_and_nos,
      product_name, packing_details, hs_code, quantity, unit, gross_weight
    } = data;

    const { rows } = await db.query(
      `INSERT INTO certificates_of_origin (
        company_id, ref_number, consignee_name, consignee_address,
        vessel, port_of_loading, port_of_discharge, marks_and_nos,
        product_name, packing_details, hs_code, quantity, unit, gross_weight,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        company_id, ref_number, consignee_name, consignee_address,
        vessel, port_of_loading, port_of_discharge, marks_and_nos,
        product_name, packing_details, hs_code, quantity, unit, gross_weight,
        req.user?.id || null
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error POST /api/documents/certificates:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/documents/certificates/:id
router.delete('/certificates/:id', requireAuth, async (req, res) => {
  try {
    await db.query(`UPDATE certificates_of_origin SET is_deleted = true WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error DELETE /api/documents/certificates:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
