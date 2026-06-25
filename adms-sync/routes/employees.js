const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Supabase admin client — profiles, roles, user_roles live here
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_PROFILE_COLUMNS = new Set([
  'id', 'company_id', 'is_active', 'created_at', 'updated_at', 'status',
  'approved_by', 'approved_at', 'monthly_salary', 'punch_deadline',
  'monthly_target', 'dob', 'joining_date', 'is_deleted', 'deleted_at',
  'deleted_by', 'full_name', 'email', 'avatar_url', 'phone',
  'employee_id', 'role', 'department', 'zoho_meeting_link',
  'requested_role', 'system_mode', 'city', 'rejection_reason',
  'email_signature', 'biometric_id'
]);

async function syncProfileToLocalDb(id, updates) {
  try {
    const keys = Object.keys(updates).filter(k => VALID_PROFILE_COLUMNS.has(k));
    if (keys.length === 0) return;

    const setClauses = keys.map((key, index) => `"${key}" = $${index + 1}`);
    const values = keys.map(key => updates[key]);
    
    const queryText = `
      UPDATE profiles 
      SET ${setClauses.join(', ')}, updated_at = NOW() 
      WHERE id = $${keys.length + 1}
      RETURNING id
    `;
    
    const { rowCount } = await db.query(queryText, [...values, id]);
    
    if (rowCount === 0) {
      console.log(`[Sync] Profile ${id} not found locally during update. Fetching from Supabase to sync...`);
      const { data: sbProfile, error: sbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!sbError && sbProfile) {
        await db.query(
          `INSERT INTO profiles (
            id, company_id, full_name, email, avatar_url, phone, employee_id, role, department, 
            zoho_meeting_link, requested_role, system_mode, city, status, rejection_reason, 
            email_signature, biometric_id, is_active, is_deleted, created_at, updated_at,
            approved_by, approved_at, monthly_salary, punch_deadline, monthly_target
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
            $22, $23, $24, $25, $26
          ) ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            is_active = EXCLUDED.is_active,
            is_deleted = EXCLUDED.is_deleted,
            updated_at = NOW()`,
          [
            sbProfile.id,
            sbProfile.company_id || null,
            sbProfile.full_name || null,
            sbProfile.email || null,
            sbProfile.avatar_url || null,
            sbProfile.phone || null,
            sbProfile.employee_id || null,
            sbProfile.role || null,
            sbProfile.department || null,
            sbProfile.zoho_meeting_link || null,
            sbProfile.requested_role || null,
            sbProfile.system_mode || null,
            sbProfile.city || null,
            sbProfile.status || 'pending',
            sbProfile.rejection_reason || null,
            sbProfile.email_signature || null,
            sbProfile.biometric_id || null,
            sbProfile.is_active ?? true,
            sbProfile.is_deleted ?? false,
            sbProfile.created_at || new Date().toISOString(),
            sbProfile.updated_at || new Date().toISOString(),
            sbProfile.approved_by || null,
            sbProfile.approved_at || null,
            sbProfile.monthly_salary || null,
            sbProfile.punch_deadline || null,
            sbProfile.monthly_target || null
          ]
        );
        console.log(`[Sync] Successfully created profile for ${id} in local VPS DB`);
      }
    } else {
      console.log(`[Sync] Successfully synced updates to local VPS DB for profile ${id}`);
    }
  } catch (err) {
    console.error(`[Sync] Failed to sync profile update for ${id} to VPS DB:`, err.message);
  }
}


// GET /api/employees - Fetch all approved employees from Supabase
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, requested_role, status, is_active, avatar_url, biometric_id, dob, joining_date, system_mode, city, monthly_salary, punch_deadline, department')
      .eq('status', 'approved')
      .eq('is_deleted', false)
      .order('full_name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/employees error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/employees/all/profiles - Fetch ALL profiles (for approvals page)
router.get('/all/profiles', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, requested_role, status, rejection_reason, created_at, department, is_active, biometric_id, monthly_salary, joining_date')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/employees/all/profiles error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/employees/:id - Fetch single employee
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    console.error('GET /api/employees/:id error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/employees - Add new employee
router.post('/', requireAuth, async (req, res) => {
  try {
    const { id, full_name, email, requested_role } = req.body;
    const { error } = await supabase
      .from('profiles')
      .insert({ id, full_name, email, requested_role, status: 'approved' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/employees error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/employees/:id - Update employee profile fields
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({ success: true });

    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) throw error;

    // Sync changes to local VPS database profiles table
    await syncProfileToLocalDb(id, updates);

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/employees/:id error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/employees/:id - Soft delete employee
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted_by = req.user.sub;
    const deleted_at = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false, is_deleted: true, deleted_at, deleted_by })
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/employees/:id error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/employees/all/profiles/:id - Approve/reject/change-role
// Enforces ONE ROLE PER PERSON: removes all existing user_roles before assigning the new one
router.put('/all/profiles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, requested_role, rejection_reason, ...otherUpdates } = req.body;

    // Build profile update payload
    const profileUpdate = { ...otherUpdates };
    if (status) profileUpdate.status = status;
    if (requested_role) profileUpdate.requested_role = requested_role;
    if (status === 'approved') {
      profileUpdate.approved_by = req.user?.sub || null;
      profileUpdate.approved_at = new Date().toISOString();
      profileUpdate.rejection_reason = null;
    }
    if (status === 'rejected') {
      profileUpdate.rejection_reason = rejection_reason || null;
      profileUpdate.approved_by = null;
      profileUpdate.approved_at = null;
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', id);
      if (profileErr) throw profileErr;

      // Sync changes to local VPS database profiles table
      await syncProfileToLocalDb(id, profileUpdate);
    }

    // Assign role — ONE ROLE PER PERSON
    if (requested_role && (status === 'approved' || !status)) {
      const { data: roleRow, error: roleErr } = await supabase
        .from('roles')
        .select('id')
        .eq('slug', requested_role)
        .maybeSingle();
      if (roleErr) throw roleErr;

      if (roleRow?.id) {
        // Remove ALL existing roles for this user (enforces one role per person)
        await supabase.from('user_roles').delete().eq('user_id', id);
        // Insert single new role
        const { error: insertErr } = await supabase
          .from('user_roles')
          .insert({ user_id: id, role_id: roleRow.id, assigned_at: new Date().toISOString() });
        if (insertErr) throw insertErr;
        console.log(`[ROLE SYNC] User ${id} assigned role '${requested_role}' (one-role enforced)`);
      } else {
        console.warn(`[ROLE SYNC] Role slug '${requested_role}' not found in Supabase roles table`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/employees/all/profiles/:id error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/employees/bio-data - Save face embedding to VPS DB
router.post('/bio-data', requireAuth, async (req, res) => {
  try {
    const { employee_id, face_embedding, sample_index, quality_score, model_version } = req.body;
    const { rows } = await db.query(
      `INSERT INTO face_embeddings (employee_id, face_embedding, sample_index, quality_score, model_version) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (employee_id, sample_index) 
       DO UPDATE SET face_embedding = EXCLUDED.face_embedding, quality_score = EXCLUDED.quality_score, model_version = EXCLUDED.model_version
       RETURNING *`,
      [employee_id, JSON.stringify(face_embedding), sample_index || 0, quality_score || null, model_version || 'face-api-ssd-mobilenetv1']
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/employees/bio-data error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/employees/bio-data/all - Fetch all face embeddings from VPS DB
router.get('/bio-data/all', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT f.id, f.employee_id, f.face_embedding, f.sample_index, f.quality_score,
             p.id as profile_id, p.full_name, p.email, p.requested_role as role
      FROM face_embeddings f
      LEFT JOIN profiles p ON f.employee_id::text = p.id::text
    `);
    
    const mapped = rows.map(r => ({
      id: r.id,
      employee_id: r.employee_id,
      face_embedding: r.face_embedding,
      sample_index: r.sample_index,
      quality_score: r.quality_score,
      employees: {
        id: r.profile_id,
        full_name: r.full_name,
        email: r.email,
        role: r.role
      }
    }));
    
    res.json(mapped);
  } catch (err) {
    console.error('GET /api/employees/bio-data/all error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/employees/:id/bio-data - Fetch face embeddings for an employee from VPS DB
router.get('/:id/bio-data', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM face_embeddings WHERE employee_id::text = $1 ORDER BY sample_index',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/employees/:id/bio-data error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/employees/:id/bio-data - Delete face embeddings for an employee from VPS DB
router.delete('/:id/bio-data', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      'DELETE FROM face_embeddings WHERE employee_id::text = $1',
      [id]
    );
    res.json({ success: true, message: 'Face embeddings deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/employees/:id/bio-data error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/employees/:id/reset-password - Generate password reset link and send to shastikaglobal11@gmail.com
router.post('/:id/reset-password', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Safety check: Only shastikaglobal11@gmail.com or users with the 'admin' or 'manager' role are authorized
    let isAuthorized = req.user.email === 'shastikaglobal11@gmail.com';
    if (!isAuthorized) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', req.user.sub || req.user.id)
        .maybeSingle();
      
      isAuthorized = requesterProfile && (
        requesterProfile.email === 'shastikaglobal11@gmail.com' ||
        requesterProfile.role === 'admin' ||
        requesterProfile.role === 'manager'
      );
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized: Only administrators are authorized to trigger password resets.' });
    }

    // 1. Fetch employee profile details
    const { data: employee, error: empErr } = await supabase
      .from('profiles')
      .select('full_name, email, company_id')
      .eq('id', id)
      .maybeSingle();

    if (empErr || !employee) {
      return res.status(404).json({ error: 'Employee profile not found.' });
    }

    if (!employee.email) {
      return res.status(400).json({ error: 'Employee does not have an email address.' });
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
        <p>You requested a password reset link for the following employee:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 150px;">Employee Name</td>
            <td style="padding: 8px 0; color: #334155;">${employee.full_name || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Employee Email</td>
            <td style="padding: 8px 0; color: #334155;">${employee.email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Employee ID</td>
            <td style="padding: 8px 0; font-family: monospace; color: #334155;">${id}</td>
          </tr>
        </table>
        <p>Click the button below to complete the password reset process on their behalf:</p>
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
          body_text: `You requested a password reset link for ${employee.full_name || 'N/A'} (${employee.email}). Reset link: ${actionLink}`,
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
        message: 'Link generated successfully, but failed to send email. You can copy it directly.',
        link: actionLink 
      });
    }

    res.json({ success: true, message: 'Password reset link sent to shastikaglobal11@gmail.com successfully.' });
  } catch (err) {
    console.error('POST /api/employees/:id/reset-password error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
