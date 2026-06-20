const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// GET /api/leads - Fetch all leads
router.get('/', requireAuth, async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (companyId) {
      const { rows } = await db.query('SELECT * FROM leads WHERE company_id = $1 AND is_deleted IS NOT TRUE ORDER BY created_at DESC', [companyId]);
      return res.json(rows);
    }

    const { rows } = await db.query('SELECT * FROM leads WHERE is_deleted IS NOT TRUE ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error("DB Error (get leads):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/leads/converted - Fetch converted leads for client acquisition view
router.get('/converted', requireAuth, async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (!companyId) {
      return res.status(400).json({ error: "company_id query parameter is required" });
    }
    // Validate company_id format to avoid passing invalid UUIDs to Postgres
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(companyId)) {
      console.log(`[DEBUG] Invalid company_id format received: ${companyId}`);
      return res.status(400).json({ error: "Invalid company_id format" });
    }

    console.log(`[DEBUG] GET /api/leads/converted - company_id=${companyId} user=${req.user?.sub || 'anon'} headers=${JSON.stringify(req.headers ? {authorization: req.headers.authorization} : {})}`);

    const { rows } = await db.query(`
      SELECT
        l.id,
        COALESCE(l.company_name, NULLIF(TRIM(l.contact_name), ''), 'Unknown') AS client_name,
        COALESCE(l.country, 'Unknown') AS country,
        COALESCE(ac.channel_name, 'Direct / Unknown') AS source,
        COALESCE(l.assigned_to, 'Unassigned') AS assigned_bde,
        COALESCE(l.converted_at, l.created_at) AS acquisition_date,
        COALESCE(l.interested_product, l.product_type, 'N/A') AS product_interested,
        0 AS deal_value,
        l.stage AS status
      FROM leads l
      LEFT JOIN acquisition_channels ac
        ON ac.id = l.source_id
      WHERE l.company_id = $1
        AND l.is_deleted IS NOT TRUE
        AND (
          l.stage ILIKE '%client%'
          OR l.stage ILIKE '%convert%'
          OR l.stage ILIKE '%won%'
        )
      ORDER BY l.created_at DESC
    `, [companyId]);

    res.json(rows);
  } catch (err) {
    console.error("DB Error (get converted leads):", err);
    if (err && err.stack) console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Debug endpoint - bypasses auth to help local development/diagnostics only
router.get('/converted/debug', async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (!companyId) return res.status(400).json({ error: 'company_id required' });
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(companyId)) return res.status(400).json({ error: 'Invalid company_id format' });

    console.log(`[DEBUG] GET /api/leads/converted/debug - company_id=${companyId}`);

    const { rows } = await db.query(`
      SELECT
        l.id,
        COALESCE(l.company_name, NULLIF(TRIM(l.contact_name), ''), 'Unknown') AS client_name,
        COALESCE(l.country, 'Unknown') AS country,
        COALESCE(ac.channel_name, 'Direct / Unknown') AS source,
        COALESCE(l.assigned_to, 'Unassigned') AS assigned_bde,
        COALESCE(l.converted_at, l.created_at) AS acquisition_date,
        COALESCE(l.interested_product, l.product_type, 'N/A') AS product_interested,
        0 AS deal_value,
        l.stage AS status
      FROM leads l
      LEFT JOIN acquisition_channels ac ON ac.id = l.source_id
      WHERE l.company_id = $1
        AND l.is_deleted IS NOT TRUE
        AND (
          l.stage ILIKE '%client%'
          OR l.stage ILIKE '%convert%'
          OR l.stage ILIKE '%won%'
        )
      ORDER BY l.created_at DESC
    `, [companyId]);

    res.json(rows);
  } catch (err) {
    console.error('DB Error (debug converted leads):', err);
    if (err && err.stack) console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/leads/add-client - Add a converted client directly
router.post('/add-client', requireAuth, async (req, res) => {
  try {
    const {
      company_name,
      country,
      inquiry_source,
      assigned_bde,
      acquisition_date,
      product_interested
    } = req.body;

    const created_by = req.user.sub;

    // Fetch user's company_id from profiles
    const { rows: profileRows } = await db.query(
      'SELECT company_id FROM profiles WHERE id = $1',
      [created_by]
    );
    const company_id = profileRows.length > 0 ? profileRows[0].company_id : null;

    if (!company_id) {
      return res.status(400).json({ error: "User profile company_id not found" });
    }

    // Resolve or create acquisition channel for inquiry_source
    let source_id = null;
    if (inquiry_source) {
      const { rows: channelRows } = await db.query(
        'SELECT id FROM acquisition_channels WHERE company_id = $1 AND LOWER(channel_name) = LOWER($2)',
        [company_id, inquiry_source.trim()]
      );
      if (channelRows.length > 0) {
        source_id = channelRows[0].id;
      } else {
        const { rows: insertChannel } = await db.query(
          'INSERT INTO acquisition_channels (company_id, channel_name, avg_lead_cost) VALUES ($1, $2, 0) RETURNING id',
          [company_id, inquiry_source.trim()]
        );
        source_id = insertChannel[0].id;
      }
    }

    // Insert into leads
    const { rows: leadRows } = await db.query(
      `INSERT INTO leads (
        company_id, company_name, country, source_id, assigned_to, 
        created_at, converted_at, product_type, stage, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        company_id,
        company_name,
        country,
        source_id,
        assigned_bde,
        acquisition_date || new Date().toISOString(),
        acquisition_date || new Date().toISOString(),
        product_interested,
        'Client Successfully Acquired',
        created_by
      ]
    );

    const createdLead = leadRows[0];

    // Check and insert into customers table to sync directory
    const custCheck = await db.query(
      'SELECT id FROM customers WHERE company_id = $1 AND LOWER(name) = LOWER($2)',
      [company_id, company_name.trim()]
    );
    if (custCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO customers (company_id, name, country, relationship_status, repeat_order_count, satisfaction_score) 
         VALUES ($1, $2, $3, $4, 0, 0)`,
        [company_id, company_name.trim(), country, 'Active Client']
      );
    }

    // Format output to match the table display
    res.status(201).json({
      id: createdLead.id,
      client_name: company_name,
      country: country,
      source: inquiry_source,
      assigned_bde: assigned_bde,
      acquisition_date: acquisition_date || createdLead.created_at,
      product_interested: product_interested,
      status: 'Client Successfully Acquired'
    });

  } catch (err) {
    console.error("DB Error (add client):", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// GET /api/leads/:id - Fetch single lead
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: "Invalid lead id" });
    }

    const { rows } = await db.query('SELECT * FROM leads WHERE id = $1 AND is_deleted IS NOT TRUE', [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("DB Error (get single lead):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/leads - Create lead
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    data.created_by = req.user.sub;

    // Fetch user's company_id from profiles if not provided
    if (!data.company_id && data.created_by) {
      const { rows: profileRows } = await db.query(
        'SELECT company_id FROM profiles WHERE id = $1',
        [data.created_by]
      );
      if (profileRows.length > 0 && profileRows[0].company_id) {
        data.company_id = profileRows[0].company_id;
      }
    }
    
    const keys = Object.keys(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');
    const values = Object.values(data);
    
    const { rows } = await db.query(
      `INSERT INTO leads (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("DB Error (create lead):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', requireAuth, async (req, res) => {
  console.log(`[DEBUG] PUT /api/leads/${req.params.id} body:`, req.body);
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ success: true });
    
    if (updates.stage === 'Won' || updates.stage === 'Client Successfully Acquired') {
      // Automatically convert to customer if not already converted
      const leadCheck = await db.query('SELECT company_id, company_name, contact_name, contact_person, country, email FROM leads WHERE id = $1', [id]);
      if (leadCheck.rows.length > 0) {
        const leadData = leadCheck.rows[0];
        
        let cmpId = leadData.company_id;
        if (!cmpId && req.user && req.user.sub) {
          const empCheck = await db.query('SELECT company_id FROM profiles WHERE id = $1', [req.user.sub]);
          if (empCheck.rows.length > 0) cmpId = empCheck.rows[0].company_id;
        }

        if (cmpId) {
          const customerName = leadData.company_name || leadData.contact_name || leadData.contact_person || 'Unknown Customer';
          const customerEmail = (leadData.email || '').trim();
          
          let custCheck;
          if (customerEmail) {
            // Check by email under the same company to satisfy idx_unique_customer_email_per_company
            custCheck = await db.query(
              'SELECT id FROM customers WHERE email = $1 AND company_id = $2',
              [customerEmail, cmpId]
            );
          } else {
            // Check by name if email is empty
            custCheck = await db.query(
              'SELECT id FROM customers WHERE name = $1 AND company_id = $2 AND (email IS NULL OR email = \'\')',
              [customerName, cmpId]
            );
          }

          if (custCheck.rows.length === 0) {
            await db.query(
              `INSERT INTO customers (company_id, name, country, email) VALUES ($1, $2, $3, $4)`,
              [cmpId, customerName, leadData.country, customerEmail || null]
            );
          }
        } else {
          console.error("Skipping conversion: no valid company_id found for lead", id);
        }
      }
      updates.stage = 'Client Successfully Acquired';
    }

    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    await db.query(`UPDATE leads SET ${setClause} WHERE id = $1`, values);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update lead):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/leads/:id - Delete lead (Soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE leads SET is_deleted = true, deleted_at = $1 WHERE id = $2', [new Date().toISOString(), id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete lead):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/leads/meta/sources - Fetch acquisition channels (only those with leads)
router.get('/meta/sources', requireAuth, async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (companyId) {
      const { rows } = await db.query(`
        SELECT DISTINCT ac.* FROM acquisition_channels ac
        INNER JOIN leads l ON ac.id = l.source_id
        WHERE ac.company_id = $1 AND l.is_deleted IS NOT TRUE
        ORDER BY ac.channel_name
      `, [companyId]);
      return res.json(rows);
    }
    const { rows } = await db.query(`
      SELECT DISTINCT ac.* FROM acquisition_channels ac
      INNER JOIN leads l ON ac.id = l.source_id
      WHERE l.is_deleted IS NOT TRUE
      ORDER BY ac.channel_name
    `);
    res.json(rows);
  } catch (err) {
    console.error("DB Error (get sources):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/leads/meta/sources - Add acquisition channel(s)
router.post('/meta/sources', requireAuth, async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    if (data.length === 0) return res.status(400).json({ error: "Empty payload" });
    
    const results = [];
    for (const item of data) {
      const { company_id, channel_name, avg_lead_cost } = item;
      const { rows } = await db.query(
        'INSERT INTO acquisition_channels (company_id, channel_name, avg_lead_cost) VALUES ($1, $2, $3) RETURNING *',
        [company_id, channel_name, avg_lead_cost || 0]
      );
      results.push(rows[0]);
    }
    res.status(201).json(Array.isArray(req.body) ? results : results[0]);
  } catch (err) {
    console.error("DB Error (post sources):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/leads/meta/sources/:id - Delete acquisition channel
router.delete('/meta/sources/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM acquisition_channels WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete source):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/leads/:id/convert - Convert lead to customer
router.post('/:id/convert', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, name, country, email } = req.body;
    
    // Insert into customers
    await db.query(
      'INSERT INTO customers (company_id, name, country, email) VALUES ($1, $2, $3, $4)',
      [company_id, name, country, email]
    );
    await db.query(
      `UPDATE leads SET stage = 'Client Successfully Acquired' WHERE id = $1 AND stage != 'Client Successfully Acquired'`,
      [id]
    );

    await db.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (convert lead):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/leads/:id/follow-ups - Add follow up and update assignee
router.post('/:id/follow-ups', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      company_name, contact_name, follow_up_date, reminder_time, note, assigned_to,
      business_category, product_type, country, mobile, email, website
    } = req.body;
    
    await db.query(
      `INSERT INTO follow_ups (
        lead_id, company_name, contact_name, follow_up_date, reminder_time, note, assigned_to, is_notified,
        business_category, product_type, country, mobile, email, website
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9, $10, $11, $12, $13)`,
      [
        id, company_name, contact_name, follow_up_date, reminder_time || null, note, assigned_to,
        business_category, product_type, country, mobile, email, website
      ]
    );
    
    await db.query('UPDATE leads SET assigned_to = $1 WHERE id = $2', [assigned_to, id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (add follow-up):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/leads/:id/activities - Fetch lead activities
router.get('/:id/activities', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT a.*, p.full_name as profile_full_name 
       FROM lead_activities a
       LEFT JOIN profiles p ON a.created_by = p.id::text
       WHERE a.lead_id = $1 
       ORDER BY a.created_at DESC`,
      [id]
    );
    
    // Format to match Supabase nested structure: profiles: { full_name }
    const formatted = rows.map(r => {
      const { profile_full_name, ...rest } = r;
      return {
        ...rest,
        profiles: { full_name: profile_full_name }
      };
    });
    
    res.json(formatted);
  } catch (err) {
    console.error("DB Error (get lead activities):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/leads/:id/quotations - Fetch lead quotations
router.get('/:id/quotations', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT id, quotation_number, status, created_at, amount, currency FROM quotations WHERE lead_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("DB Error (get lead quotations):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/leads/:id/activities - Add activity
router.post('/:id/activities', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    data.lead_id = id;
    data.created_by = req.user.sub;
    
    const keys = Object.keys(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');
    const values = Object.values(data);
    
    const { rows } = await db.query(
      `INSERT INTO lead_activities (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("DB Error (create lead activity):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
