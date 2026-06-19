const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// --- API ROUTE: Get Attendance ---
router.get('/', requireAuth, async (req, res) => {
  try {
    const { start, end } = req.query;
    let queryText = `
      SELECT a.id, a.employee_id, a.date::text as date, a.clock_in, a.clock_out, a.status, a.is_manual, a.is_excused, a.is_deleted, a.notes, p.full_name as name 
      FROM attendance_logs a 
      LEFT JOIN profiles p ON a.employee_id::text = p.id::text 
      WHERE (a.is_deleted IS NULL OR a.is_deleted = false)
    `;
    const params = [];
    
    if (start && end) {
      queryText += ' AND a.date >= $1 AND a.date <= $2';
      params.push(start, end);
    }
    
    queryText += ' ORDER BY date DESC';
    
    const { rows } = await db.query(queryText, params);
    res.json(rows);
  } catch (err) {
    console.error("Postgres Error (get attendance):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- API ROUTE: Manual Time ---
router.put('/manual-time', requireAuth, async (req, res) => {
  try {
    const { employee_id, date, check_in, check_out } = req.body;
    const marked_by = req.user.sub;
    
    const { rows } = await db.query(
      'SELECT id FROM attendance_logs WHERE employee_id = $1 AND date = $2 LIMIT 1',
      [employee_id, date]
    );

    if (rows.length > 0) {
      await db.query(
        'UPDATE attendance_logs SET clock_in = $1, clock_out = $2, is_manual = true, status = $3, is_deleted = false, deleted_at = null, deleted_by = null WHERE employee_id = $4 AND date = $5',
        [check_in, check_out || null, 'present', employee_id, date]
      );
    } else {
      await db.query(
        'INSERT INTO attendance_logs (employee_id, date, clock_in, clock_out, is_manual, status) VALUES ($1, $2, $3, $4, true, $5)',
        [employee_id, date, check_in, check_out || null, 'present']
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Postgres Error (manual-time):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- API ROUTE: Mark OD ---
router.put('/mark-od', requireAuth, async (req, res) => {
  try {
    const { employee_id, date, od_reason, check_in } = req.body;
    const marked_by = req.user.sub;
    
    const { rows } = await db.query(
      'SELECT id FROM attendance_logs WHERE employee_id = $1 AND date = $2 LIMIT 1',
      [employee_id, date]
    );
    
    if (rows.length > 0) {
      await db.query(
        'UPDATE attendance_logs SET status = $1, is_manual = true, clock_in = $2, notes = $3, is_deleted = false, deleted_at = null, deleted_by = null WHERE employee_id = $4 AND date = $5',
        ['present', check_in, od_reason || 'Field Trip (OD)', employee_id, date]
      );
    } else {
      await db.query(
        'INSERT INTO attendance_logs (employee_id, date, clock_in, status, is_manual, notes) VALUES ($1, $2, $3, $4, true, $5)',
        [employee_id, date, check_in, 'present', od_reason || 'Field Trip (OD)']
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Postgres Error (mark-od):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- API ROUTE: Mark Paid Leave ---
router.put('/mark-leave', requireAuth, async (req, res) => {
  try {
    const { employee_id, date } = req.body;
    
    const { rows } = await db.query(
      'SELECT id FROM attendance_logs WHERE employee_id = $1 AND date = $2 LIMIT 1',
      [employee_id, date]
    );

    if (rows.length > 0) {
      await db.query(
        'UPDATE attendance_logs SET status = $1, is_manual = true, is_deleted = false, deleted_at = null, deleted_by = null WHERE employee_id = $2 AND date = $3',
        ['on_leave', employee_id, date]
      );
    } else {
      await db.query(
        'INSERT INTO attendance_logs (employee_id, date, status, is_manual) VALUES ($1, $2, $3, true)',
        [employee_id, date, 'on_leave']
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Postgres Error (mark-leave):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- API ROUTE: Toggle Excused ---
router.put('/toggle-excused', requireAuth, async (req, res) => {
  try {
    const { id, is_excused } = req.body;
    await db.query(
      'UPDATE attendance_logs SET is_excused = $1 WHERE id = $2',
      [is_excused, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Postgres Error (toggle-excused):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- API ROUTE: Delete Log ---
router.put('/delete-log', requireAuth, async (req, res) => {
  try {
    const { id } = req.body;
    const deletedBy = req.user.sub;
    const deletedAt = new Date().toISOString();
    await db.query(
      'UPDATE attendance_logs SET is_deleted = true, deleted_at = $1, deleted_by = $2 WHERE id = $3',
      [deletedAt, deletedBy, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Postgres Error (delete-log):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- API ROUTE: Face Attendance Sync ---
router.post('/face-sync', requireAuth, async (req, res) => {
  try {
    const { employee_id, date, check_in, check_out, status } = req.body;
    
    const { rows } = await db.query(
      'SELECT id FROM attendance_logs WHERE employee_id = $1 AND date = $2 LIMIT 1',
      [employee_id, date]
    );

    if (rows.length > 0) {
      // Update check_out if it exists, else check_in
      if (check_out) {
        await db.query(
          'UPDATE attendance_logs SET clock_out = $1, is_deleted = false, deleted_at = null, deleted_by = null WHERE employee_id = $2 AND date = $3',
          [check_out, employee_id, date]
        );
        await db.query(
          'UPDATE face_attendance SET clock_out = $1 WHERE employee_id = $2 AND date = $3',
          [check_out, employee_id, date]
        );
      } else if (check_in) {
        await db.query(
          'UPDATE attendance_logs SET clock_in = $1, status = $2, is_deleted = false, deleted_at = null, deleted_by = null WHERE employee_id = $3 AND date = $4',
          [check_in, status, employee_id, date]
        );
        await db.query(
          'UPDATE face_attendance SET clock_in = $1, status = $2 WHERE employee_id = $3 AND date = $4',
          [check_in, status, employee_id, date]
        );
      }
    } else {
      if (check_in) {
        await db.query(
          'INSERT INTO attendance_logs (employee_id, date, clock_in, clock_out, is_manual, status) VALUES ($1, $2, $3, $4, false, $5)',
          [employee_id, date, check_in, check_out || null, status || 'present']
        );
        await db.query(
          'INSERT INTO face_attendance (employee_id, date, clock_in, clock_out, status) VALUES ($1, $2, $3, $4, $5)',
          [employee_id, date, check_in, check_out || null, status || 'present']
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Postgres Error (face-sync):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- API ROUTE: Punch In/Out ---
router.post('/punch', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    // Use IST date to match biometric device (avoids midnight UTC vs IST mismatch)
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const nowIso = new Date().toISOString();
    
    const { rows } = await db.query(
      'SELECT * FROM attendance_logs WHERE employee_id = $1 AND date = $2 LIMIT 1',
      [userId, todayStr]
    );
    
    if (rows.length === 0) {
      // Punch In
      await db.query(
        'INSERT INTO attendance_logs (employee_id, date, status, clock_in) VALUES ($1, $2, $3, $4)',
        [userId, todayStr, 'present', nowIso]
      );
      res.json({ success: true, type: 'in' });
    } else {
      const log = rows[0];
      if (!log.clock_out) {
        // Punch Out
        await db.query(
          'UPDATE attendance_logs SET clock_out = $1 WHERE id = $2',
          [nowIso, log.id]
        );
        res.json({ success: true, type: 'out' });
      } else {
        res.status(400).json({ error: "Already punched out for today" });
      }
    }
  } catch (err) {
    console.error("Postgres Error (punch):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
