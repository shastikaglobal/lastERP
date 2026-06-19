const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// profiles and user_permissions live in Supabase, NOT in local VPS DB
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/user-permissions?user_id=xxx  OR  GET /api/user-permissions (admin matrix)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { user_id } = req.query;

    if (user_id) {
      // Single user — return their permissions array
      const { data, error } = await supabase
        .from('user_permissions')
        .select('section, has_access')
        .eq('user_id', user_id);
      if (error) throw error;
      return res.json(data || []);
    }

    // All users + their permissions (for admin matrix view)
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, requested_role')
      .eq('is_deleted', false)
      .order('full_name');
    if (profErr) throw profErr;

    const { data: perms, error: permsErr } = await supabase
      .from('user_permissions')
      .select('user_id, section, has_access');
    if (permsErr) throw permsErr;

    const mapped = (profiles || []).map(p => {
      const userPerms = (perms || [])
        .filter(up => String(up.user_id) === String(p.id))
        .map(up => ({ section: up.section, has_access: up.has_access }));
      return { ...p, permissions: userPerms };
    });

    console.log(`[API /user-permissions] Sent ${mapped.length} users to frontend.`);
    res.json(mapped);
  } catch (err) {
    console.error('GET /api/user-permissions error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/user-permissions/:user_id — permissions for a specific user
router.get('/:user_id', requireAuth, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { data, error } = await supabase
      .from('user_permissions')
      .select('section, has_access')
      .eq('user_id', user_id);
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('GET /api/user-permissions/:user_id error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/user-permissions — upsert a single permission
router.post('/', requireAuth, async (req, res) => {
  try {
    const { user_id, section, has_access } = req.body;
    if (!user_id || !section || typeof has_access !== 'boolean') {
      return res.status(400).json({ error: 'Missing or invalid body parameters' });
    }

    const { error } = await supabase
      .from('user_permissions')
      .upsert(
        { user_id, section, has_access, granted_by: req.user?.sub || null },
        { onConflict: 'user_id,section' }
      );
    if (error) throw error;

    console.log(`[API /user-permissions] Saved: user=${user_id} section="${section}" access=${has_access}`);
    return res.json({ success: true, message: 'Permission updated' });
  } catch (err) {
    console.error('POST /api/user-permissions error:', err.message);
    return res.status(500).json({ success: false, error: err?.message || 'Internal Server Error' });
  }
});

module.exports = router;
