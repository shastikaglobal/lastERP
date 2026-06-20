const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/meta/container_types
router.get('/container_types', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT name FROM container_types ORDER BY name');
    res.json(rows.map(r => ({ name: r.name })));
  } catch (err) {
    console.error('DB Error (container_types):', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/packaging_types
router.get('/packaging_types', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT name FROM packaging_types ORDER BY name');
    res.json(rows.map(r => ({ name: r.name })));
  } catch (err) {
    console.error('DB Error (packaging_types):', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
