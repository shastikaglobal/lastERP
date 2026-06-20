import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
let db = null
try {
  db = require('./adms-sync/db.js')
} catch (err) {
  console.warn('Could not load adms-sync/db.js, continuing with local pool if available')
}
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
let supabase = null
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
} else {
  console.warn('Supabase service role configuration missing. Auth and permissions mirror may be limited.')
}

const requireAuth = async (req, res, next) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase auth not configured' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    req.user = { sub: user.id, ...user }
    next()
  } catch (err) {
    console.error('Auth validation failed:', err)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

const app = express()
app.use(cors())
app.use(express.json())

// Resolve database connection string from env (flexible)
function getDatabaseUrl() {
  if (process.env.PG_VPS_ENABLED === 'true') {
    const host = process.env.PG_HOST
    if (!host) return null
    const user = process.env.PG_USER || process.env.PGUSER || 'postgres'
    const password = process.env.PG_PASSWORD || process.env.PGPASSWORD || ''
    const database = process.env.PG_DATABASE || process.env.PG_DB || process.env.PGDATABASE || 'postgres'
    const port = process.env.PG_PORT || '5432'
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
  }
  
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  return null
}

const DB_URL = getDatabaseUrl()
let pool = null
if (DB_URL) {
  pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
} else {
  console.warn('No database URL found. /api/vehicles endpoints will return 500 until configured.')
}

// Ensure drivers table exists (use adms-sync db helper when available)
(async () => {
  const createSql = `CREATE TABLE IF NOT EXISTS drivers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_name text NOT NULL,
    license_number text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
  )`;
  try {
    if (db && db.query) {
      await db.query(createSql)
      console.log('Ensured drivers table exists (via adms-sync/db.js)')
    } else if (pool) {
      await pool.query(createSql)
      console.log('Ensured drivers table exists (via local pool)')
    } else {
      console.warn('No DB available to create drivers table')
    }
    // Ensure vehicles table exists too (used by frontend /api/vehicles)
    const createVehiclesSql = `CREATE TABLE IF NOT EXISTS vehicles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vehicle_number text NOT NULL,
      vehicle_type text,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    )`;
    try {
      if (db && db.query) {
        await db.query(createVehiclesSql)
        console.log('Ensured vehicles table exists (via adms-sync/db.js)')
      } else if (pool) {
        await pool.query(createVehiclesSql)
        console.log('Ensured vehicles table exists (via local pool)')
      } else {
        console.warn('No DB available to create vehicles table')
      }
    } catch (e) {
      console.error('Failed to ensure vehicles table exists:', e?.message || e)
    }
    // Ensure driver_name column exists and migrate from older 'name' column if present
    const ensureCols = `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_name text; ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number text;`;
    if (db && db.query) {
      await db.query(ensureCols)
      // If legacy 'name' column exists, copy values
      try {
        await db.query("UPDATE drivers SET driver_name = name WHERE driver_name IS NULL AND (SELECT to_regclass('public.drivers') IS NOT NULL)")
      } catch (e) {
        // best-effort migration; ignore errors
      }
    } else if (pool) {
      await pool.query(ensureCols)
      try {
        await pool.query("UPDATE drivers SET driver_name = name WHERE driver_name IS NULL")
      } catch (e) {}
    }
  } catch (err) {
    console.error('Failed to ensure drivers table exists:', err?.message || err)
  }
})()

// Vehicles API - uses direct Postgres queries to avoid Supabase schema cache issues
app.get('/api/vehicles', async (req, res) => {
  try {
    const executor = pool || (db && db.query ? db : null)
    const executorName = executor ? (executor === pool ? 'pool' : 'adms-sync/db') : (supabase ? 'supabase' : 'none')
    console.log(`GET /api/vehicles executor: ${executorName}`)
    if (executor) {
      const { rows } = await executor.query('SELECT id, vehicle_number, vehicle_type FROM vehicles WHERE is_active = true ORDER BY vehicle_number')
      return res.json(rows)
    }

    if (supabase) {
      const { data, error } = await supabase.from('vehicles').select('id, vehicle_number, vehicle_type').eq('is_active', true).order('vehicle_number', { ascending: true })
      if (error) {
        console.error('GET /api/vehicles supabase error:', error.message || error)
        return res.status(500).json({ error: 'Failed to fetch vehicles' })
      }
      return res.json(data || [])
    }

    return res.status(500).json({ error: 'Database not configured' })
  } catch (err) {
    console.error('GET /api/vehicles error:', err?.message || err)
    res.status(500).json({ error: 'Failed to fetch vehicles' })
  }
})

app.post('/api/vehicles', async (req, res) => {
  try {
    const { vehicle_number, vehicle_type } = req.body
    if (!vehicle_number) return res.status(400).json({ error: 'vehicle_number is required' })

    const executor = pool || (db && db.query ? db : null)
    const executorName = executor ? (executor === pool ? 'pool' : 'adms-sync/db') : (supabase ? 'supabase' : 'none')
    console.log(`POST /api/vehicles executor: ${executorName}`)
    if (executor) {
      const insertQuery = `INSERT INTO vehicles (vehicle_number, vehicle_type, is_active) VALUES ($1, $2, true) RETURNING id, vehicle_number, vehicle_type`
      const values = [vehicle_number, vehicle_type || null]
      const { rows } = await executor.query(insertQuery, values)
      return res.json(rows[0])
    }

    if (supabase) {
      const { data, error } = await supabase.from('vehicles').insert([{
        vehicle_number,
        vehicle_type: vehicle_type || null,
        is_active: true
      }]).select('id, vehicle_number, vehicle_type').single()
      if (error) {
        console.error('POST /api/vehicles supabase error:', error.message || error)
        return res.status(500).json({ error: 'Failed to create vehicle' })
      }
      return res.json(data)
    }

    return res.status(500).json({ error: 'Database not configured' })
  } catch (err) {
    console.error('POST /api/vehicles error:', err?.message || err)
    res.status(500).json({ error: 'Failed to create vehicle' })
  }
})

// Purchase Orders API
app.get('/api/purchase_orders', async (req, res) => {
  try {
    const executor = pool || (db && db.query ? db : null)
    if (!executor) return res.status(500).json({ error: 'Database not configured' })

    const { rows } = await executor.query(
      `SELECT * FROM purchase_orders WHERE is_deleted IS NOT TRUE ORDER BY order_date DESC`
    )
    return res.json(rows)
  } catch (err) {
    console.error('GET /api/purchase_orders error:', err?.message || err)
    return res.status(500).json({ error: err?.message || 'Failed to fetch purchase orders' })
  }
})

app.post('/api/purchase_orders', async (req, res) => {
  try {
    const { company_id, po_number, farmer_id, status, order_date, total, currency } = req.body
    if (!company_id || !farmer_id || !po_number || !order_date || !total) {
      return res.status(400).json({ error: 'company_id, po_number, farmer_id, order_date, and total are required' })
    }

    const executor = pool || (db && db.query ? db : null)
    if (!executor) return res.status(500).json({ error: 'Database not configured' })

    const { rows } = await executor.query(
      `INSERT INTO purchase_orders (company_id, po_number, farmer_id, status, order_date, total, currency, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING *`,
      [company_id, po_number, farmer_id, status || 'draft', order_date, total, currency || 'INR']
    )
    return res.status(201).json(rows[0])
  } catch (err) {
    console.error('POST /api/purchase_orders error:', err?.message || err)
    return res.status(500).json({ error: err?.message || 'Failed to create purchase order' })
  }
})

// Drivers API
app.get('/api/drivers', async (req, res) => {
  try {
    const executor = (db && db.query) ? db : pool
    if (!executor) return res.status(500).json({ error: 'Database not configured' })
    const { rows } = await executor.query("SELECT id, driver_name, COALESCE(license_number, '') AS license_number FROM drivers WHERE is_active = true ORDER BY driver_name")
    res.json(rows)
  } catch (err) {
    console.error('GET /api/drivers error:', err?.message || err)
    res.status(500).json({ error: 'Failed to fetch drivers' })
  }
})

app.post('/api/drivers', async (req, res) => {
  try {
    const executor = (db && db.query) ? db : pool
    if (!executor) return res.status(500).json({ error: 'Database not configured' })
    // Accept either `driver_name` or legacy `name` from frontend
    const driver_name = req.body.driver_name || req.body.name || req.body.driverName
    const license_number = req.body.license_number || req.body.licenseNumber || null
    if (!driver_name) return res.status(400).json({ error: 'driver_name is required' })

    const insertQuery = `INSERT INTO drivers (driver_name, license_number, is_active) VALUES ($1, $2, true) RETURNING id, driver_name, license_number`
    const values = [driver_name, license_number]
    const { rows } = await executor.query(insertQuery, values)
    res.json(rows[0])
  } catch (err) {
    console.error('POST /api/drivers error:', err?.message || err)
    res.status(500).json({ error: 'Failed to create driver' })
  }
})

// GET /api/employees — returns approved employees from Supabase profiles
app.get('/api/employees', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, requested_role, department, is_active, status')
      .eq('status', 'approved')
      .eq('is_deleted', false)
      .order('full_name')
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('GET /api/employees error:', err?.message || err)
    res.status(500).json({ error: 'Failed to fetch employees' })
  }
})

// GET /api/employees/all/profiles — returns ALL profiles (for approvals page)
app.get('/api/employees/all/profiles', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, requested_role, status, rejection_reason, created_at, department, is_active')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('GET /api/employees/all/profiles error:', err?.message || err)
    res.status(500).json({ error: 'Failed to fetch profiles' })
  }
})

// PUT /api/employees/all/profiles/:id — approve/reject or change role
// Enforces ONE role per person: deletes existing user_roles before assigning new one
app.put('/api/employees/all/profiles/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { status, requested_role, rejection_reason } = req.body
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

    // Build profile update payload
    const profileUpdate = {}
    if (status) profileUpdate.status = status
    if (requested_role) profileUpdate.requested_role = requested_role
    if (status === 'approved') {
      profileUpdate.approved_by = req.user?.sub || null
      profileUpdate.approved_at = new Date().toISOString()
      profileUpdate.rejection_reason = null
    }
    if (status === 'rejected') {
      profileUpdate.rejection_reason = rejection_reason || null
      profileUpdate.approved_by = null
      profileUpdate.approved_at = null
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', id)
    if (profileErr) throw profileErr

    // Assign role in user_roles (one role per person — delete old, insert new)
    if (requested_role && (status === 'approved' || !status)) {
      // Look up role_id for this slug
      const { data: roleRow, error: roleErr } = await supabase
        .from('roles')
        .select('id')
        .eq('slug', requested_role)
        .maybeSingle()
      if (roleErr) throw roleErr

      if (roleRow?.id) {
        // Remove ALL existing roles for this user (enforce one role per person)
        await supabase.from('user_roles').delete().eq('user_id', id)
        // Insert new role
        const { error: insertErr } = await supabase
          .from('user_roles')
          .insert({ user_id: id, role_id: roleRow.id, assigned_at: new Date().toISOString() })
        if (insertErr) throw insertErr
      } else {
        console.warn(`Role slug '${requested_role}' not found in roles table — skipping user_roles update`)
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('PUT /api/employees/all/profiles/:id error:', err?.message || err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// GET /api/user-permissions — profiles + their permissions (all from Supabase)
app.get('/api/user-permissions', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, requested_role')
      .eq('is_deleted', false)
      .order('full_name')
    if (profErr) throw profErr

    const { data: perms, error: permsErr } = await supabase
      .from('user_permissions')
      .select('user_id, section, has_access')
    if (permsErr) throw permsErr

    const mapped = (profiles || []).map((p) => {
      const userPerms = (perms || [])
        .filter((up) => String(up.user_id) === String(p.id))
        .map((up) => ({ section: up.section, has_access: up.has_access }))
      return { ...p, permissions: userPerms }
    })

    res.json(mapped)
  } catch (err) {
    console.error('GET /api/user-permissions error:', err?.message || err)
    res.status(500).json({ error: 'Failed to load permissions' })
  }
})

// POST /api/user-permissions — upsert a single permission in Supabase
app.post('/api/user-permissions', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

    const { user_id, section, has_access } = req.body
    if (!user_id || !section || typeof has_access !== 'boolean') {
      return res.status(400).json({ error: 'Missing or invalid body parameters' })
    }

    const { error } = await supabase
      .from('user_permissions')
      .upsert(
        { user_id, section, has_access, granted_by: req.user?.sub || null },
        { onConflict: 'user_id,section' }
      )
    if (error) throw error

    res.json({ success: true })
  } catch (err) {
    console.error('POST /api/user-permissions error:', err?.message || err)
    res.status(500).json({ error: 'Failed to save permission' })
  }
})

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { messages, system } = req.body
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        system: system || 'You are a helpful ERP assistant.',
        messages: messages
      })
    })

    const data = await response.json()
    console.log('Claude response:', JSON.stringify(data))
    res.json({ content: data.content[0].text })

  } catch (err) {
    console.error('Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(3001, () => console.log('✅ Server running on port 3001'))