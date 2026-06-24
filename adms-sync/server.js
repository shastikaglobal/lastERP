const WebSocket = require('ws');
globalThis.WebSocket = WebSocket;

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Polyfill fetch for older Node.js versions
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const path = require('path');
const fs = require('fs');

let dir = __dirname;
let envPath;
while (dir) {
  const check = path.join(dir, '.env');
  if (fs.existsSync(check)) {
    envPath = check;
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
if (envPath) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 8082;

// Initialize Supabase Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ CRITICAL ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.");
  process.exit(1);
}

const nodeFetch = require('node-fetch');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: {
    transport: WebSocket
  },
  global: {
    fetch: nodeFetch
  }
});

app.use(express.json());
app.use(cors());

// Handle JSON parse errors from body-parser to avoid crashing on malformed payloads
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.warn('⚠️ Invalid JSON payload received:', err.message);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

app.use((req, res, next) => {
  if (req.url.includes('/api/emails') && req.method === 'POST') {
    require('fs').appendFileSync('requests.log', JSON.stringify({ body: req.body, time: new Date() }) + '\n');
  }
  next();
});

// --- Vehicles & Drivers Top Level APIs ---
app.get('/api/vehicles', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, vehicle_number, vehicle_type FROM vehicles WHERE is_active = true AND is_deleted IS NOT TRUE ORDER BY vehicle_number');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/vehicles error:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const { vehicle_number, vehicle_type } = req.body;
    if (!vehicle_number) return res.status(400).json({ error: 'vehicle_number is required' });
    const insertQuery = `INSERT INTO vehicles (vehicle_number, vehicle_type, is_active) VALUES ($1, $2, true) RETURNING id, vehicle_number, vehicle_type`;
    const { rows } = await db.query(insertQuery, [vehicle_number, vehicle_type || null]);
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/vehicles error:', err?.message || err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

app.get('/api/drivers', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT id, driver_name, COALESCE(license_number, '') AS license_number FROM drivers WHERE is_active = true AND is_deleted IS NOT TRUE ORDER BY driver_name");
    res.json(rows);
  } catch (err) {
    console.error('GET /api/drivers error:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

app.post('/api/drivers', async (req, res) => {
  try {
    const driver_name = req.body.driver_name || req.body.name || req.body.driverName;
    const license_number = req.body.license_number || req.body.licenseNumber || null;
    if (!driver_name) return res.status(400).json({ error: 'driver_name is required' });
    const insertQuery = `INSERT INTO drivers (driver_name, license_number, is_active) VALUES ($1, $2, true) RETURNING id, driver_name, license_number`;
    const { rows } = await db.query(insertQuery, [driver_name, license_number]);
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/drivers error:', err?.message || err);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// --- Mount API Routes ---
const attendanceRoutes = require('./routes/attendance');
const employeesRoutes = require('./routes/employees');
const crmRoutes = require('./routes/crm');
const followUpsRoutes = require('./routes/follow_ups');
const crmTasksRoutes = require('./routes/crm_tasks');
const quotationsRoutes = require('./routes/quotations');
const inventoryRoutes = require('./routes/inventory');
const warehouseRoutes = require('./routes/warehouse');
const analyticsRoutes = require('./routes/analytics');
const dispatchRoutes = require('./routes/dispatch');
const invoicesRoutes = require('./routes/invoices');
const mailboxRoutes = require('./routes/mailbox');
const productsRoutes = require('./routes/products');
const customersRoutes = require('./routes/customers');
const metaRoutes = require('./routes/meta');
const settingsRoutes = require('./routes/settings');
const financeRoutes = require('./routes/finance');
const ordersRoutes = require('./routes/orders');
const hrRoutes = require('./routes/hr');
const farmersRoutes = require('./routes/farmers');
const permissionsRoutes = require('./routes/permissions');
const securityRoutes = require('./routes/security');
const procurementRoutes = require('./routes/procurement');
const purchaseOrdersRoutes = require('./routes/purchase_orders');
const documentsRoutes = require('./routes/documents');

app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/leads', crmRoutes);
app.use('/api/crm/leads', crmRoutes);
app.use('/api/crm-tasks', crmTasksRoutes);
app.use('/api/follow-ups', followUpsRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/farmers', farmersRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/user-permissions', permissionsRoutes);
app.use('/api', invoicesRoutes);
app.use('/api/emails', mailboxRoutes);
app.use('/api', productsRoutes);
app.use('/api', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/purchase_orders', purchaseOrdersRoutes);
app.use('/api/documents', documentsRoutes);



app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // 1. Fetch employee profile details from Supabase to find company_id and full_name
    const { data: employee, error: empErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_id')
      .eq('email', email.trim())
      .maybeSingle();

    if (empErr || !employee) {
      console.warn(`[ResetPassword] Profile not found for email: ${email}`);
      return res.status(404).json({ error: 'Account with this email not found.' });
    }

    // 2. Generate programmatic reset link using Supabase Admin Auth API
    const redirectTo = `${req.headers.origin || 'http://localhost:8080'}/auth`;
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: employee.email,
      options: {
        redirectTo: redirectTo
      }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('[ResetPassword] Generate link failed:', linkErr);
      return res.status(500).json({ error: linkErr?.message || 'Failed to generate reset link.' });
    }

    const actionLink = linkData.properties.action_link;

    // 3. Send email to shastikaglobal11@gmail.com with details and recovery link
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b;">🔑 Password Reset Request</h2>
        <p>A user requested a password reset link for the following account:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 150px;">Employee Name</td>
            <td style="padding: 8px 0; color: #334155;">${employee.full_name || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Employee Email</td>
            <td style="padding: 8px 0; color: #334155;">${employee.email}</td>
          </tr>
        </table>
        <p>Click the button below to complete the password reset process for them:</p>
        <div style="margin: 25px 0;">
          <a href="${actionLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password Now</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          If the button above does not work, copy and paste this URL into your web browser:<br/>
          <span style="word-break: break-all; color: #2563eb;">${actionLink}</span>
        </p>
      </div>
    `;

    console.log(`[ResetPassword] Fetching Zoho account to send reset email to shastikaglobal11@gmail.com...`);
    const { data: zohoAcc, error: zohoAccErr } = await supabase
      .from('zoho_accounts')
      .select('id, account_email')
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();

    let emailSent = false;
    let mailErrorMsg = '';

    if (zohoAcc) {
      console.log(`[ResetPassword] Using Zoho Account: ${zohoAcc.account_email}`);
      const { data: emailRecord, error: insertErr } = await supabase
        .from('emails')
        .insert({
          company_id: employee.company_id,
          account_id: zohoAcc.id,
          to_address: 'shastikaglobal11@gmail.com',
          from_address: zohoAcc.account_email,
          subject: `🔑 Password Reset Link: ${employee.full_name || employee.email}`,
          body_html: htmlContent,
          body_text: `A user requested a password reset link for ${employee.full_name || 'N/A'} (${employee.email}). Reset link: ${actionLink}`,
          status: 'pending',
          folder: 'sent',
          received_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!insertErr && emailRecord) {
        const { data: mailResult, error: mailErr } = await supabase.functions.invoke('webhook-send-email', {
          body: { record: emailRecord }
        });

        if (!mailErr && mailResult?.success !== false) {
          emailSent = true;
        } else {
          mailErrorMsg = mailErr?.message || mailResult?.error || 'Webhook invocation returned failure.';
          console.error('[ResetPassword] Zoho Mail send failed:', mailErrorMsg);
        }
      } else {
        mailErrorMsg = insertErr?.message || 'Failed to insert email log record.';
        console.error('[ResetPassword] Email record insert failed:', mailErrorMsg);
      }
    } else {
      mailErrorMsg = zohoAccErr?.message || 'No connected Zoho account found in database.';
      console.error('[ResetPassword] Zoho account query failed/empty:', mailErrorMsg);
    }

    if (!emailSent) {
      return res.json({ 
        success: true, 
        message: 'Password reset request initiated, but email delivery failed. Please check the administrator Zoho Mail integration.'
      });
    }

    res.json({ success: true, message: 'Password reset link sent to shastikaglobal11@gmail.com successfully.' });
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Temporary top-level debug endpoint to fetch converted leads without router/auth issues
app.get('/api/leads/converted/debug2', async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (!companyId) return res.status(400).json({ error: 'company_id required' });
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(companyId)) return res.status(400).json({ error: 'Invalid company_id format' });

    console.log(`[DEBUG] /api/leads/converted/debug2 - company_id=${companyId}`);

    const q = `
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
    `;

    const { rows } = await db.query(q, [companyId]);
    res.json(rows);
  } catch (err) {
    console.error('DB Error (debug2 converted leads):', err);
    if (err && err.stack) console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

console.log("🚀 Starting ADMS Sync Server...");
console.log(`🔗 Supabase Target URL: ${SUPABASE_URL}`);

/**
 * 1. GET /iclock/cdata - Handshake & Device Initialization
 * Device queries server configurations and registers itself.
 */
app.get(['/iclock/cdata', '/iclock/cdata.aspx'], (req, res) => {
  const sn = req.query.SN || 'UNKNOWN';
  console.log(`\n📡 [GET /iclock/cdata] Handshake received from device SN: ${sn}`);
  console.log("Params:", req.query);

  // Configuration options to send back to the device to control sync behavior
  const responseConfig = [
    `GET OPTION FROM: ${sn}`,
    `Stamp=${Date.now()}`,
    `OpStamp=${process.env.ADMS_OP_STAMP || '1'}`,
    `ErrorDelay=${process.env.ADMS_ERROR_DELAY || '60'}`,
    `Delay=${process.env.ADMS_DELAY || '30'}`,
    `TransTimes=${process.env.ADMS_TRANS_TIMES || '00:00;23:59'}`,
    `TransInterval=${process.env.ADMS_TRANS_INTERVAL || '1'}`,
    `TransFlag=${process.env.ADMS_TRANS_FLAG || '1111111111'}`,
    `Realtime=${process.env.ADMS_REALTIME || '1'}`,
    `Encrypt=${process.env.ADMS_ENCRYPT || '0'}`
  ].join('\r\n') + '\r\n';

  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(responseConfig);
});

/**
 * 2. POST /iclock/cdata - Receive Punch Logs (ATTLOG) & Operation Logs (OPERLOG)
 * The device pushes new attendance records here.
 */
app.post(['/iclock/cdata', '/iclock/cdata.aspx'], express.text({ type: '*/*', limit: '10mb' }), async (req, res) => {
  const sn = req.query.SN || 'UNKNOWN';
  const table = req.query.table || 'UNKNOWN';
  console.log(`\n📥 [POST /iclock/cdata] Data upload from SN: ${sn}, Table: ${table}`);

  const rawData = req.body;
  if (!rawData || rawData.trim() === '') {
    console.log("⚠️ Received empty payload.");
    return res.status(200).send('OK');
  }

  // Handle Attendance Logs
  if (table.toUpperCase() === 'ATTLOG') {
    try {
      const lines = rawData.split(/\r?\n/);
      console.log(`📦 Parsing ${lines.length} lines of attendance logs...`);

      // Fetch active profiles from Supabase to map biometric IDs to employee IDs
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, company_id, biometric_id');

      if (profErr) {
        console.error("❌ Failed to load profiles from Supabase:", profErr.message);
        // Respond OK anyway so device doesn't get stuck, but log the error
        return res.status(200).send('OK');
      }

      let processedCount = 0;

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // ATTLOG format: User-PIN \t Timestamp \t Status \t VerifyMode \t WorkCode ...
        const parts = line.split('\t');
        const biometricId = parts[0]?.trim();
        const punchTimeStr = parts[1]?.trim(); // Format: YYYY-MM-DD HH:mm:ss

        if (!biometricId || !punchTimeStr) {
          console.warn(`⚠️ Skipped invalid line format: "${line}"`);
          continue;
        }

        // Match profile by biometric_id
        const emp = profiles.find(p => 
          p.biometric_id === biometricId || 
          (p.biometric_id && Number(p.biometric_id) === Number(biometricId))
        );

        if (!emp) {
          console.warn(`⚠️ Skipped punch: Biometric ID [${biometricId}] is not mapped to any profile in Supabase.`);
          continue;
        }

        // Parse punch timestamp
        const dateParts = punchTimeStr.split(' ');
        const dateStr = dateParts[0]; // "YYYY-MM-DD"
        
        // Assume device is running in India Standard Time (+05:30)
        const tzOffset = process.env.DEVICE_TIMEZONE_OFFSET || '+05:30';
        const punchTimeUTC = new Date(punchTimeStr.replace(' ', 'T') + tzOffset);

        if (isNaN(punchTimeUTC.getTime())) {
          console.error(`❌ Invalid timestamp parsed: "${punchTimeStr}"`);
          continue;
        }

        const punchTimeIso = punchTimeUTC.toISOString();

        // Check if attendance record already exists for this day
        let existing = null;
        try {
          const { rows } = await db.query(
            'SELECT * FROM attendance_logs WHERE employee_id = $1 AND date = $2 LIMIT 1',
            [emp.id, dateStr]
          );
          if (rows.length > 0) existing = rows[0];
        } catch (existErr) {
          console.error(`❌ DB error checking attendance for employee [${emp.id}] on [${dateStr}]:`, existErr.message);
          continue;
        }

        if (!existing) {
          // Create new record with clock_in = punchTime
          try {
            await db.query(
              'INSERT INTO attendance_logs (employee_id, date, status, clock_in, clock_out) VALUES ($1, $2, $3, $4, $5)',
              [emp.id, dateStr, 'present', punchTimeIso, null]
            );
            console.log(`✅ Logged Check-In for employee [${emp.id}] on ${dateStr} at ${punchTimeIso}`);
            processedCount++;
          } catch (insertErr) {
            console.error(`❌ Failed to insert attendance:`, insertErr.message);
          }
        } else {
          // Record exists. Update clock_in or clock_out.
          let updatedClockIn = existing.clock_in;
          let updatedClockOut = existing.clock_out;

          const currentPunchTimeMs = punchTimeUTC.getTime();
          const punchStatus = parts[2]?.trim();

          if (punchStatus === '0') {
            // Explicit Check-In from device
            if (!updatedClockIn) {
              updatedClockIn = punchTimeIso;
            } else if (currentPunchTimeMs < new Date(updatedClockIn).getTime()) {
              updatedClockIn = punchTimeIso; // Keep the earliest check-in
            }
          } else if (punchStatus === '1') {
            // Explicit Check-Out from device
            if (!updatedClockOut) {
              updatedClockOut = punchTimeIso;
            } else if (currentPunchTimeMs > new Date(updatedClockOut).getTime()) {
              updatedClockOut = punchTimeIso; // Keep the latest check-out
            }
          } else {
            // Fallback to time-based guessing if device doesn't send 0/1 properly
            if (!updatedClockIn) {
              updatedClockIn = punchTimeIso;
            } else {
              const existingInMs = new Date(updatedClockIn).getTime();
              if (currentPunchTimeMs < existingInMs) {
                updatedClockIn = punchTimeIso; // Earlier punch is check_in
              }
            }
            
            const existingInMsAfter = new Date(updatedClockIn).getTime();
            if (currentPunchTimeMs > existingInMsAfter) {
              if (!updatedClockOut) {
                if (currentPunchTimeMs - existingInMsAfter >= 60 * 1000) { // 1 min buffer
                  updatedClockOut = punchTimeIso;
                }
              } else {
                const existingOutMs = new Date(updatedClockOut).getTime();
                if (currentPunchTimeMs > existingOutMs) {
                  updatedClockOut = punchTimeIso; // Later punch is check_out
                }
              }
            }
          }

          try {
            updatedClockIn = updatedClockIn ? new Date(updatedClockIn).toISOString() : null;
            updatedClockOut = updatedClockOut ? new Date(updatedClockOut).toISOString() : null;
            await db.query(
              'UPDATE attendance_logs SET clock_in = $1, clock_out = $2, status = $3 WHERE id = $4',
              [updatedClockIn, updatedClockOut, 'present', existing.id]
            );
            console.log(`🔄 Updated attendance for employee [${emp.id}] on ${dateStr}: In=${updatedClockIn?.substring(11,19)}, Out=${updatedClockOut?.substring(11,19)}`);
            processedCount++;
          } catch (updateErr) {
            console.error(`❌ Failed to update attendance [${existing.id}]:`, updateErr.message);
          }
        }
        
        // --- IMMUTABLE RAW PUNCH STORAGE ---
        // Insert the raw punch log into the 'AttLogs' table so no one can erase the raw data
        try {
          const direction = parts[2]?.trim() === '0' ? 'in' : (parts[2]?.trim() === '1' ? 'out' : parts[2]?.trim());
          await db.query(
            'INSERT INTO "AttLogs" ("EmployeeCode", "LogDateTime", "DownloadDateTime", "Direction", "DeviceId") VALUES ($1, $2, $3, $4, $5)',
            [biometricId, punchTimeStr, new Date().toISOString(), direction, sn]
          );
          console.log(`🔒 Safely stored immutable raw punch in AttLogs for [${biometricId}] at ${punchTimeStr}`);
        } catch (rawLogErr) {
          console.error(`❌ Failed to store raw punch in AttLogs for [${biometricId}]:`, rawLogErr.message);
        }
        
      }

      console.log(`🎉 Sync completed. Successfully processed ${processedCount} punch(es).`);
    } catch (err) {
      console.error("❌ Exception during ATTLOG parsing:", err);
    }
  }

  // Respond with OK to acknowledge receipt
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('OK');
});

/**
 * 3. GET /iclock/getrequest - Pending commands query
 * Device asks server if there are any commands to execute.
 */
app.get(['/iclock/getrequest', '/iclock/getrequest.aspx'], (req, res) => {
  const sn = req.query.SN || 'UNKNOWN';
  console.log(`\n⏳ [GET /iclock/getrequest] Command request from SN: ${sn}`);
  
  // Return OK indicating no pending commands
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('OK');
});

/**
 * 4. POST /iclock/devicecmd - Command Execution Result
 * Device posts the execution result of commands.
 */
app.post(['/iclock/devicecmd', '/iclock/devicecmd.aspx'], (req, res) => {
  const sn = req.query.SN || 'UNKNOWN';
  console.log(`\n📥 [POST /iclock/devicecmd] Command execution report from SN: ${sn}`);
  console.log("Payload:", req.body);

  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('OK');
});

app.options('/force-logout', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * 5. POST /force-logout - Admin Force Logout
 * Called from frontend to securely punch out a user (bypasses RLS)
 */
app.post('/force-logout', express.json(), async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const { userId, sessionId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  
  const nowIso = new Date().toISOString();
  let updatedSession = false;
  let updatedAttendance = false;

  // 1. Update user_sessions
  if (sessionId) {
    const { error: sessErr } = await supabase
      .from('user_sessions')
      .update({ logout_time: nowIso })
      .eq('id', sessionId);
    if (!sessErr) updatedSession = true;
  } else {
    // find open session
    const { error: sessErr } = await supabase
      .from('user_sessions')
      .update({ logout_time: nowIso })
      .eq('user_id', userId)
      .is('logout_time', null);
    if (!sessErr) updatedSession = true;
  }

  // 2. Update attendance_logs
  const today = nowIso.split('T')[0];
  try {
    const { rowCount } = await db.query(
      'UPDATE attendance_logs SET check_out = $1 WHERE employee_id = $2 AND date = $3 AND check_out IS NULL',
      [nowIso, userId, today]
    );
    if (rowCount > 0) updatedAttendance = true;
  } catch (attErr) {
    console.error("Attendance update error:", attErr);
  }

  // 3. Log them out of the actual application (bypassing auth tokens)
  let loggedOutApp = false;
  const { error: authErr } = await supabase.auth.admin.signOut(userId, 'global');
  if (!authErr) {
    loggedOutApp = true;
  } else {
    console.error("Auth sign out error:", authErr);
  }

  res.json({ success: true, updatedSession, updatedAttendance, loggedOutApp });
});

// --- PostgreSQL LISTEN/NOTIFY Real-Time Sync ---
const { Client } = require('pg');

let pgListenerRetries = 0;
const MAX_PG_LISTENER_RETRIES = 5;

async function startPgListener() {
  if (pgListenerRetries >= MAX_PG_LISTENER_RETRIES) {
    console.warn(`⚠️ PG Listener connection failed ${MAX_PG_LISTENER_RETRIES} times. Reconnection disabled to prevent log spam. Please ensure PostgreSQL is running at ${process.env.PG_HOST || '127.0.0.1'}:${process.env.PG_PORT || '5432'} and restart the server.`);
    return;
  }

  const pgClient = new Client({
    user: process.env.PG_USER || 'erp_admin',
    host: process.env.PG_HOST || '127.0.0.1',
    database: process.env.PG_DATABASE || 'shastika_erp',
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT || '5432', 10),
  });

  pgClient.on('error', (err) => {
    console.error('❌ PG Listener Client Error:', err.message);
    pgListenerRetries++;
    // Try to reconnect after a delay
    setTimeout(startPgListener, 5000);
  });

  pgClient.on('end', () => {
    console.log('🔌 PG Listener Client connection ended.');
  });

  try {
    await pgClient.connect();
    pgListenerRetries = 0; // Reset on successful connection
    console.log('🔌 Dedicated PG Listener Client connected.');
    
    await pgClient.query('LISTEN data_changed');
    console.log('👂 Listening to PG channel "data_changed"');

    pgClient.on('notification', (msg) => {
      console.log(`🔔 Received PG notify on "data_changed": ${msg.payload}`);
      
      // Broadcast to Supabase Realtime channel 'global_data_sync'
      supabase.channel('global_data_sync').send({
        type: 'broadcast',
        event: 'data_changed',
        payload: { table: msg.payload }
      }).then(() => {
        console.log(`📡 Broadcasted data_changed for table: ${msg.payload}`);
      }).catch(err => {
        console.error('❌ Broadcast failed:', err.message || err);
      });
    });
  } catch (err) {
    console.error('❌ Failed to connect PG Listener:', err.message);
    pgListenerRetries++;
    setTimeout(startPgListener, 5000);
  }
}

// Start PG listener
startPgListener();

// Start Server
const ensureUserPermissionsSetup = async () => {
  // user_permissions lives in Supabase — no local DB setup needed
  // Local VPS DB only holds: attendance_logs, drivers, vehicles, AttLogs, etc.
  console.log('✅ Skipping local user_permissions setup — managed in Supabase.');
};

const startServer = async () => {
  await ensureUserPermissionsSetup();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🟢 ADMS Sync Server is listening on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch(err => {
  console.error('❌ Failed to start ADMS Sync Server:', err);
  process.exit(1);
});


