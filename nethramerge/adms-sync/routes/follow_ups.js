const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../db');

// GET /api/follow-ups
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM follow_ups 
       WHERE is_deleted = false 
       ORDER BY follow_up_date DESC`
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error("DB Error (get follow-ups):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/follow-ups/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    if (Object.keys(updates).length === 0) return res.json({ success: true });

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
    values.push(req.params.id);

    await db.query(
      `UPDATE follow_ups SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update follow-up):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/follow-ups/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE follow_ups SET is_deleted = true, deleted_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete follow-up):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
