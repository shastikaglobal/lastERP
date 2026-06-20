const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// GET /api/farmers
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM farmers WHERE is_deleted IS NOT TRUE ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('DB Error (get farmers):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/farmers
router.post('/', requireAuth, async (req, res) => {
  try {
    const { company_id, full_name, email, phone, country, district, primary_crops, is_active } = req.body;
    
    if (!company_id || !full_name) {
      return res.status(400).json({ error: 'company_id and full_name are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO farmers (company_id, full_name, email, phone, country, district, primary_crops, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [company_id, full_name, email, phone, country, district, primary_crops, is_active ?? true]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB Error (create farmer):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// DELETE /api/farmers/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE farmers SET is_deleted = true, is_active = false, deleted_at = NOW(), deleted_by = $1 WHERE id = $2 RETURNING id`,
      [req.user?.id || null, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DB Error (delete farmer):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/farmers/:id/convert - Convert a farmer record into a customer (Syncs VPS and Supabase)
router.post('/:id/convert', requireAuth, async (req, res) => {
  const farmerId = req.params.id;
  const { company_id, name, email, country, phone, notes } = req.body;

  if (!company_id) {
    return res.status(400).json({ error: 'company_id is required' });
  }

  try {
    let { rows: farmerRows } = await db.query(
      `SELECT id, company_id, full_name, email, phone, country, notes, is_deleted FROM farmers WHERE id = $1`,
      [farmerId]
    );

    // If not found locally, try fetching from Supabase and sync it to the local VPS DB
    if (farmerRows.length === 0 || farmerRows[0].is_deleted) {
      if (supabase) {
        console.log(`[Sync] Farmer ${farmerId} not found locally or is_deleted. Fetching from Supabase...`);
        const { data: sbFarmer, error: sbError } = await supabase
          .from('farmers')
          .select('*')
          .eq('id', farmerId)
          .maybeSingle();

        if (sbError) {
          console.error('[Sync] Error fetching farmer from Supabase:', sbError.message);
        } else if (sbFarmer) {
          console.log(`[Sync] Found farmer in Supabase. Syncing to local VPS DB: ${sbFarmer.full_name}`);
          const insertFarmerQuery = `
            INSERT INTO farmers (id, company_id, code, full_name, email, phone, village, district, state, country, primary_crops, bank_account, notes, is_active, is_deleted, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false, NOW())
            ON CONFLICT (id) DO UPDATE 
            SET is_deleted = false, full_name = EXCLUDED.full_name, email = EXCLUDED.email
            RETURNING *
          `;
          const { rows: syncedRows } = await db.query(insertFarmerQuery, [
            sbFarmer.id,
            sbFarmer.company_id,
            sbFarmer.code || null,
            sbFarmer.full_name,
            sbFarmer.email || null,
            sbFarmer.phone || null,
            sbFarmer.village || null,
            sbFarmer.district || null,
            sbFarmer.state || null,
            sbFarmer.country || null,
            sbFarmer.primary_crops || null,
            sbFarmer.bank_account || null,
            sbFarmer.notes || null,
            sbFarmer.is_active ?? true
          ]);
          farmerRows = syncedRows;
        }
      }
    }

    if (farmerRows.length === 0 || farmerRows[0].is_deleted) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const farmer = farmerRows[0];
    const customerEmail = (email || farmer.email || '').trim();

    // Check duplicate customer locally
    if (customerEmail) {
      const { rows: existingCustomers } = await db.query(
        `SELECT id FROM customers WHERE company_id = $1 AND email = $2 LIMIT 1`,
        [company_id, customerEmail]
      );

      if (existingCustomers.length > 0) {
        return res.status(409).json({ error: 'A customer with this email already exists for the selected company.' });
      }

      // Check duplicate customer in Supabase
      if (supabase) {
        const { data: existingSb, error: sbCustErr } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', company_id)
          .eq('email', customerEmail)
          .maybeSingle();

        if (sbCustErr) {
          console.error('[Sync] Error checking duplicate customer in Supabase:', sbCustErr.message);
        } else if (existingSb) {
          return res.status(409).json({ error: 'A customer with this email already exists in Supabase.' });
        }
      }
    }

    // Insert customer in local VPS database
    const { rows: insertedRows } = await db.query(
      `INSERT INTO customers (company_id, name, email, country, phone, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        company_id,
        name || farmer.full_name,
        customerEmail || null,
        country || farmer.country || null,
        phone || farmer.phone || null,
        notes || farmer.notes || null,
      ]
    );

    const newCustomer = insertedRows[0];

    // Insert customer in Supabase to keep them in sync
    if (supabase) {
      console.log(`[Sync] Inserting converted customer into Supabase: ${newCustomer.name}`);
      const { error: insertSbErr } = await supabase
        .from('customers')
        .insert([{
          id: newCustomer.id,
          company_id: newCustomer.company_id,
          name: newCustomer.name,
          email: newCustomer.email,
          country: newCustomer.country,
          phone: newCustomer.phone,
          notes: newCustomer.notes
        }]);

      if (insertSbErr) {
        console.error('[Sync] Failed to insert customer to Supabase:', insertSbErr.message);
      }
    }

    return res.status(201).json(newCustomer);
  } catch (err) {
    console.error('DB Error (convert farmer):', err);
    return res.status(500).json({ error: err.message || 'Failed to convert farmer to customer' });
  }
});

module.exports = router;
