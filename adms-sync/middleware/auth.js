const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const db = require('../db');

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

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log(`[DEBUG] requireAuth: No token provided for ${req.method} ${req.url}`);
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(' ')[1];
  let user = null;
  let lastError = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        lastError = error;
        // Do not retry on definite client auth errors
        if (error.status === 400 || error.status === 401 || error.message?.includes('invalid') || error.message?.includes('expired')) {
          break;
        }
        console.warn(`[requireAuth] Attempt ${attempt}/${maxAttempts} returned error:`, error.message);
      } else if (data?.user) {
        user = data.user;
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[requireAuth] Attempt ${attempt}/${maxAttempts} connection failed:`, err.message);
    }

    if (attempt < maxAttempts && !user) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  if (!user) {
    console.log(`[DEBUG] requireAuth: Token check failed for ${req.method} ${req.url}:`, lastError?.message || 'User not found');
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Ensure user's profile exists in the local VPS database to prevent foreign key violations on created_by columns
  try {
    const { rows: localProfile } = await db.query(
      'SELECT id FROM profiles WHERE id = $1 LIMIT 1',
      [user.id]
    );

    if (localProfile.length === 0) {
      console.log(`[requireAuth] User ${user.id} not found in local profiles. Syncing from Supabase...`);
      const { data: sbProfile, error: sbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (sbError) {
        console.error('[requireAuth] Error fetching profile from Supabase:', sbError.message);
      } else if (sbProfile) {
        console.log(`[requireAuth] Found profile in Supabase. Syncing to local profiles: ${sbProfile.full_name}`);
        await db.query(
          `INSERT INTO profiles (
            id, company_id, full_name, email, avatar_url, phone, employee_id, role, department, 
            zoho_meeting_link, requested_role, system_mode, city, status, rejection_reason, 
            email_signature, biometric_id, is_active, is_deleted, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
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
            sbProfile.updated_at || new Date().toISOString()
          ]
        );
        console.log(`[requireAuth] Successfully synced profile for user ${user.id}`);
      } else {
        console.warn(`[requireAuth] Profile not found in Supabase for user ${user.id}. Creating skeleton local profile...`);
        await db.query(
          `INSERT INTO profiles (id, email, is_active, is_deleted, created_at, updated_at)
           VALUES ($1, $2, true, false, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [user.id, user.email || null]
        );
      }
    }
  } catch (syncErr) {
    console.error('[requireAuth] Failed to sync user profile to local DB:', syncErr);
  }

  req.user = { sub: user.id, ...user };
  next();
};

module.exports = { requireAuth };
