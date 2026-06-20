const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/settings - Fetch company settings for the authenticated user's company
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    
    // Find the user's company_id from profiles
    const { rows: profileRows } = await db.query(
      'SELECT company_id FROM profiles WHERE id = $1',
      [userId]
    );
    
    if (profileRows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    const companyId = profileRows[0].company_id;
    if (!companyId) {
      return res.status(400).json({ error: "No company associated with this profile" });
    }
    
    // Fetch the company details
    const { rows: companyRows } = await db.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companyRows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    res.json(companyRows[0]);
  } catch (err) {
    console.error("DB Error (get settings):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/settings - Update company settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    
    // Find the user's company_id from profiles
    const { rows: profileRows } = await db.query(
      'SELECT company_id FROM profiles WHERE id = $1',
      [userId]
    );
    
    if (profileRows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    const companyId = profileRows[0].company_id;
    if (!companyId) {
      return res.status(400).json({ error: "No company associated with this profile" });
    }
    
    const updates = req.body;
    
    // Define columns that are allowed to be updated on companies
    const allowedFields = [
      'name',
      'base_currency',
      'signature_url',
      'invoice_prefix',
      'quotation_prefix',
      'order_prefix',
      'shipment_prefix',
      'smtp_host',
      'smtp_port',
      'smtp_user',
      'from_email',
      'smtp_pass'
    ];
    
    const keys = [];
    const values = [companyId];
    
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        keys.push(`"${field}" = $${keys.length + 2}`);
        values.push(updates[field]);
      }
    });
    
    if (keys.length === 0) {
      return res.json({ success: true, message: "No updates provided" });
    }
    
    const queryText = `UPDATE companies SET ${keys.join(', ')} WHERE id = $1`;
    await db.query(queryText, values);
    
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update settings):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
