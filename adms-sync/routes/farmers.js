const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const { createClient } = require('@supabase/supabase-js');
const nodeFetch = require('node-fetch');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        fetch: nodeFetch
      }
    })
  : null;

// GET /api/farmers
router.get('/', requireAuth, async (req, res) => {
  try {
    let { company_id } = req.query;
    if (!company_id) {
      const userRes = await db.query('SELECT company_id FROM profiles WHERE id = $1 LIMIT 1', [req.user.sub]);
      if (userRes.rows.length > 0 && userRes.rows[0].company_id) {
        company_id = userRes.rows[0].company_id;
      } else {
        company_id = '00000000-0000-0000-0000-00000000ae01';
      }
      console.log(`[GET /api/farmers] company_id was missing, resolved to: ${company_id}`);
    }

    if (supabase) {
      try {
        console.log('[Sync] Fetching latest farmers from Supabase...');
        const { data: sbFarmers, error: sbError } = await supabase
          .from('farmers')
          .select('*')
          .eq('company_id', company_id);

        if (sbError) {
          console.error('[Sync] Supabase fetch failed:', sbError.message);
        } else if (sbFarmers && sbFarmers.length > 0) {
          console.log(`[Sync] Found ${sbFarmers.length} farmers in Supabase. Syncing to VPS DB...`);
          for (const farmer of sbFarmers) {
            const upsertQuery = `
              INSERT INTO farmers (
                id, company_id, code, full_name, email, phone, village, district, state, country, 
                primary_crops, bank_account, notes, is_active, is_deleted, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                $11, $12, $13, $14, $15, $16, $17
              )
              ON CONFLICT (id) DO UPDATE SET
                company_id = EXCLUDED.company_id,
                code = EXCLUDED.code,
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                village = EXCLUDED.village,
                district = EXCLUDED.district,
                state = EXCLUDED.state,
                country = EXCLUDED.country,
                primary_crops = EXCLUDED.primary_crops,
                bank_account = EXCLUDED.bank_account,
                notes = EXCLUDED.notes,
                is_active = EXCLUDED.is_active,
                is_deleted = EXCLUDED.is_deleted,
                updated_at = EXCLUDED.updated_at
            `;
            await db.query(upsertQuery, [
              farmer.id,
              farmer.company_id,
              farmer.code || null,
              farmer.full_name,
              farmer.email || null,
              farmer.phone || null,
              farmer.village || null,
              farmer.district || null,
              farmer.state || null,
              farmer.country || null,
              farmer.primary_crops || null,
              farmer.bank_account || null,
              farmer.notes || null,
              farmer.is_active ?? true,
              farmer.is_deleted ?? false,
              farmer.created_at,
              farmer.updated_at
            ]);
          }

          // Mark any farmers in local DB that are NOT in the active/inactive list in Supabase (or deleted)
          const sbIds = sbFarmers.map(f => f.id);
          if (sbIds.length > 0) {
            await db.query(
              `UPDATE farmers SET is_deleted = true WHERE company_id = $1 AND id NOT IN (${sbIds.map((_, i) => `$${i + 2}`).join(', ')})`,
              [company_id, ...sbIds]
            );
          }
        }
      } catch (syncErr) {
        console.error('[Sync] Error during dynamic farmers sync:', syncErr.message);
      }
    }

    const query = `
      SELECT f.*, 
             CASE WHEN c.id IS NOT NULL THEN 'converted' ELSE 'active' END as conversion_status
      FROM farmers f
      LEFT JOIN customers c ON c.farmer_id = f.id
      WHERE f.company_id = $1 AND f.is_deleted IS NOT TRUE
      ORDER BY f.created_at DESC
    `;
    const { rows } = await db.query(query, [company_id]);
    res.json(rows);
  } catch (err) {
    console.error('DB Error (get farmers):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// POST /api/farmers
router.post('/', requireAuth, async (req, res) => {
  try {
    let { company_id, full_name, email, phone, country, district, primary_crops, is_active } = req.body;
    
    if (!company_id) {
      const userRes = await db.query('SELECT company_id FROM profiles WHERE id = $1 LIMIT 1', [req.user.sub]);
      if (userRes.rows.length > 0 && userRes.rows[0].company_id) {
        company_id = userRes.rows[0].company_id;
      } else {
        company_id = '00000000-0000-0000-0000-00000000ae01';
      }
      console.log(`[POST /api/farmers] company_id was missing, resolved to: ${company_id}`);
    }

    if (!full_name) {
      return res.status(400).json({ error: 'full_name is required' });
    }

    const { rows } = await db.query(
      `INSERT INTO farmers (company_id, full_name, email, phone, country, district, primary_crops, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [company_id, full_name, email, phone, country, district, primary_crops, is_active ?? true]
    );

    const newFarmer = rows[0];

    if (supabase) {
      try {
        console.log(`[Sync] Inserting new farmer to Supabase: ${newFarmer.id}`);
        const { error: sbError } = await supabase
          .from('farmers')
          .insert([{
            id: newFarmer.id,
            company_id: newFarmer.company_id,
            code: newFarmer.code || null,
            full_name: newFarmer.full_name,
            email: newFarmer.email || null,
            phone: newFarmer.phone || null,
            village: newFarmer.village || null,
            district: newFarmer.district || null,
            state: newFarmer.state || null,
            country: newFarmer.country || null,
            primary_crops: newFarmer.primary_crops || null,
            bank_account: newFarmer.bank_account || null,
            notes: newFarmer.notes || null,
            is_active: newFarmer.is_active ?? true,
            is_deleted: newFarmer.is_deleted ?? false,
            created_at: newFarmer.created_at,
            updated_at: newFarmer.updated_at
          }]);

        if (sbError) {
          console.error('[Sync] Failed to sync new farmer to Supabase:', sbError.message);
        } else {
          console.log('[Sync] Successfully synced new farmer to Supabase');
        }
      } catch (syncErr) {
        console.error('[Sync] Exception during farmer insert sync to Supabase:', syncErr.message);
      }
    }

    res.status(201).json(newFarmer);
  } catch (err) {
    console.error('DB Error (create farmer):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// GET /api/farmers/converted
router.get('/converted', requireAuth, async (req, res) => {
  try {
    let { company_id } = req.query;
    if (!company_id) {
      const userRes = await db.query('SELECT company_id FROM profiles WHERE id = $1 LIMIT 1', [req.user.sub]);
      if (userRes.rows.length > 0 && userRes.rows[0].company_id) {
        company_id = userRes.rows[0].company_id;
      } else {
        company_id = '00000000-0000-0000-0000-00000000ae01';
      }
      console.log(`[GET /api/farmers/converted] company_id was missing, resolved to: ${company_id}`);
    }
    const { rows } = await db.query(
      `SELECT f.id FROM farmers f 
       JOIN customers c ON c.farmer_id = f.id 
       WHERE f.company_id = $1 AND f.is_deleted IS NOT TRUE`,
      [company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('DB Error (get converted farmers):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// GET /api/farmers/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM farmers WHERE id = $1 AND is_deleted IS NOT TRUE`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('DB Error (get farmer by id):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// PUT /api/farmers/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, country, district, primary_crops, is_active, notes, bank_account, state, village, code } = req.body;
    
    const { rows } = await db.query(
      `UPDATE farmers SET 
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        country = COALESCE($4, country),
        district = COALESCE($5, district),
        primary_crops = COALESCE($6, primary_crops),
        is_active = COALESCE($7, is_active),
        notes = COALESCE($8, notes),
        bank_account = COALESCE($9, bank_account),
        state = COALESCE($10, state),
        village = COALESCE($11, village),
        code = COALESCE($12, code),
        updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [full_name, email, phone, country, district, primary_crops, is_active, notes, bank_account, state, village, code, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const updatedFarmer = rows[0];

    if (supabase) {
      try {
        console.log(`[Sync] Updating farmer in Supabase: ${id}`);
        const { error: sbError } = await supabase
          .from('farmers')
          .update({
            code: updatedFarmer.code,
            full_name: updatedFarmer.full_name,
            email: updatedFarmer.email,
            phone: updatedFarmer.phone,
            village: updatedFarmer.village,
            district: updatedFarmer.district,
            state: updatedFarmer.state,
            country: updatedFarmer.country,
            primary_crops: updatedFarmer.primary_crops,
            bank_account: updatedFarmer.bank_account,
            notes: updatedFarmer.notes,
            is_active: updatedFarmer.is_active,
            updated_at: updatedFarmer.updated_at
          })
          .eq('id', id);

        if (sbError) {
          console.error('[Sync] Failed to sync updated farmer to Supabase:', sbError.message);
        } else {
          console.log('[Sync] Successfully synced updated farmer to Supabase');
        }
      } catch (syncErr) {
        console.error('[Sync] Exception during farmer update sync to Supabase:', syncErr.message);
      }
    }

    res.json(updatedFarmer);
  } catch (err) {
    console.error('DB Error (update farmer):', err);
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

    if (supabase) {
      try {
        console.log(`[Sync] Soft-deleting farmer in Supabase: ${req.params.id}`);
        const { error: sbError } = await supabase
          .from('farmers')
          .update({
            is_deleted: true,
            is_active: false,
            deleted_at: new Date().toISOString(),
            deleted_by: req.user?.id || null
          })
          .eq('id', req.params.id);

        if (sbError) {
          console.error('[Sync] Failed to sync deleted farmer to Supabase:', sbError.message);
        } else {
          console.log('[Sync] Successfully synced deleted farmer to Supabase');
        }
      } catch (syncErr) {
        console.error('[Sync] Exception during farmer delete sync to Supabase:', syncErr.message);
      }
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

    // Check if customer with this farmer_id already exists (most reliable)
    const { rows: existingByFarmer } = await db.query(
      `SELECT * FROM customers WHERE company_id = $1 AND farmer_id = $2 LIMIT 1`,
      [company_id, farmerId]
    );

    let customerRecord = null;

    if (existingByFarmer.length > 0) {
      customerRecord = existingByFarmer[0];
      console.log(`[Sync] Farmer ${farmerId} already converted to customer ${customerRecord.id}. Linking to CRM leads...`);
    } else {
      // Check if a customer with the same email exists in VPS DB
      let existingVpsCust = null;
      if (customerEmail) {
        const { rows } = await db.query(
          `SELECT * FROM customers WHERE company_id = $1 AND email = $2 LIMIT 1`,
          [company_id, customerEmail]
        );
        if (rows.length > 0) {
          existingVpsCust = rows[0];
        }
      }

      // Check if a customer with the same email exists in Supabase
      let existingSbCust = null;
      if (customerEmail && supabase) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', company_id)
          .eq('email', customerEmail)
          .maybeSingle();
        if (error) {
          console.error('[Sync] Error checking duplicate customer in Supabase:', error.message);
        } else {
          existingSbCust = data;
        }
      }

      const hasOtherFarmer = (existingVpsCust && existingVpsCust.farmer_id) || (existingSbCust && existingSbCust.farmer_id);

      if ((existingVpsCust || existingSbCust) && !hasOtherFarmer) {
        console.log(`[Sync] Customer with email ${customerEmail} already exists and is not linked to another farmer. Connecting farmer ${farmerId} to this customer...`);
        
        // Use existing ID
        const targetId = existingVpsCust?.id || existingSbCust?.id;

        // If it exists in Supabase but not in VPS DB, insert it into VPS first
        if (!existingVpsCust && existingSbCust) {
          const { rows } = await db.query(
            `INSERT INTO customers (id, company_id, name, email, country, phone, notes, farmer_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
              targetId,
              company_id,
              name || existingSbCust.name || farmer.full_name,
              customerEmail,
              country || existingSbCust.country || farmer.country || null,
              phone || existingSbCust.phone || farmer.phone || null,
              notes || existingSbCust.notes || farmer.notes || null,
              farmerId
            ]
          );
          existingVpsCust = rows[0];
        } else {
          // Update local VPS customer to set farmer_id
          const { rows } = await db.query(
            `UPDATE customers SET farmer_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [farmerId, targetId]
          );
          existingVpsCust = rows[0];
        }

        customerRecord = existingVpsCust;

        // Update Supabase customer to set farmer_id
        if (supabase) {
          const { error: sbUpdateErr } = await supabase
            .from('customers')
            .update({ farmer_id: farmerId })
            .eq('id', targetId);
          if (sbUpdateErr) {
            console.error('[Sync] Failed to update customer farmer_id in Supabase:', sbUpdateErr.message);
          }
        }
      } else {
        // Create new customer record
        // If a customer with this email already exists in the company, set email to null to avoid unique key violation
        const insertEmail = (existingVpsCust || existingSbCust) ? null : customerEmail;

        // Insert into local VPS database
        const { rows: insertedRows } = await db.query(
          `INSERT INTO customers (company_id, name, email, country, phone, notes, farmer_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            company_id,
            name || farmer.full_name,
            insertEmail || null,
            country || farmer.country || null,
            phone || farmer.phone || null,
            notes || farmer.notes || null,
            farmerId,
          ]
        );

        customerRecord = insertedRows[0];

        // Sync insert to Supabase
        if (supabase) {
          console.log(`[Sync] Inserting converted customer into Supabase: ${customerRecord.name}`);
          const { error: insertSbErr } = await supabase
            .from('customers')
            .insert([{
              id: customerRecord.id,
              company_id: customerRecord.company_id,
              name: customerRecord.name,
              email: customerRecord.email,
              country: customerRecord.country,
              phone: customerRecord.phone,
              notes: customerRecord.notes,
              farmer_id: farmerId,
            }]);

          if (insertSbErr) {
            console.error('[Sync] Failed to insert customer to Supabase:', insertSbErr.message);
          }
        }
      }
    }

    // Now, also connect/upsert this converted customer to the CRM leads database so it shows up in Customer Database page!
    if (customerRecord) {
      // Check if a lead with same email or company name exists
      let existingLead = null;
      if (customerEmail) {
        const { rows } = await db.query(
          `SELECT id, stage FROM leads WHERE company_id = $1 AND email = $2 AND is_deleted IS NOT TRUE LIMIT 1`,
          [company_id, customerEmail]
        );
        if (rows.length > 0) {
          existingLead = rows[0];
        }
      }

      if (!existingLead) {
        const { rows } = await db.query(
          `SELECT id, stage FROM leads WHERE company_id = $1 AND company_name = $2 AND is_deleted IS NOT TRUE LIMIT 1`,
          [company_id, customerRecord.name]
        );
        if (rows.length > 0) {
          existingLead = rows[0];
        }
      }

      if (existingLead) {
        console.log(`[Sync] Existing lead found for this customer: ${existingLead.id}. Updating stage to Client Successfully Acquired...`);
        // Update stage in VPS DB
        await db.query(
          `UPDATE leads SET stage = 'Client Successfully Acquired', updated_at = NOW() WHERE id = $1`,
          [existingLead.id]
        );
        // Update stage in Supabase
        if (supabase) {
          const { error: leadSbErr } = await supabase
            .from('leads')
            .update({ stage: 'Client Successfully Acquired' })
            .eq('id', existingLead.id);
          if (leadSbErr) {
            console.error('[Sync] Failed to update lead stage in Supabase:', leadSbErr.message);
          }
        }
      } else {
        console.log(`[Sync] No existing lead found. Creating a corresponding lead record for CRM Customer Database...`);
        
        // Insert into leads in VPS DB
        const leadId = customerRecord.id; // Sync the IDs to keep them aligned
        await db.query(
          `INSERT INTO leads (id, company_id, company_name, contact_name, country, email, mobile, phone, stage, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Client Successfully Acquired', NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET stage = 'Client Successfully Acquired', updated_at = NOW()`,
          [
            leadId,
            company_id,
            customerRecord.name,
            customerRecord.name,
            customerRecord.country || null,
            customerRecord.email || null,
            customerRecord.phone || null,
            customerRecord.phone || null,
          ]
        );

        // Sync insert to Supabase
        if (supabase) {
          const { error: sbLeadErr } = await supabase
            .from('leads')
            .insert([{
              id: leadId,
              company_id: company_id,
              company_name: customerRecord.name,
              contact_name: customerRecord.name,
              country: customerRecord.country || null,
              email: customerRecord.email || null,
              mobile: customerRecord.phone || null,
              phone: customerRecord.phone || null,
              stage: 'Client Successfully Acquired'
            }]);
          if (sbLeadErr) {
            console.error('[Sync] Failed to insert corresponding lead to Supabase:', sbLeadErr.message);
          }
        }
      }
    }

    return res.status(200).json(customerRecord);
  } catch (err) {
    console.error('DB Error (convert farmer):', err);
    return res.status(500).json({ error: err.message || 'Failed to convert farmer to customer' });
  }
});

module.exports = router;
