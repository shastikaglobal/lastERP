const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// ==========================================
// PRODUCTS  (mounted at /api → routes here use /products/...)
// ==========================================

// GET /api/products - Fetch all products
router.get('/products', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products WHERE is_deleted IS NOT TRUE ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error("DB Error (get products):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/products/:id - Fetch single product
router.get('/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("DB Error (get single product):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/products - Add new product
router.post('/products', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const keys = Object.keys(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');
    const values = Object.values(data);

    const { rows } = await db.query(
      `INSERT INTO products (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("DB Error (create product):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/products/:id - Update product
router.put('/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ success: true });

    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];

    await db.query(`UPDATE products SET ${setClause} WHERE id = $1`, values);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update product):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/products/:id - Soft delete product
router.delete('/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.sub || null;
    await db.query(
      'UPDATE products SET is_deleted = true, is_active = false, deleted_at = $1, deleted_by = $2 WHERE id = $3',
      [new Date().toISOString(), deletedBy, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete product):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ==========================================
// CATEGORIES  (mounted at /api → routes here use /categories/...)
// ==========================================

// GET /api/categories - Fetch all categories
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error("DB Error (get categories):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/categories - Add category
router.post('/categories', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const keys = Object.keys(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');
    const values = Object.values(data);

    const { rows } = await db.query(
      `INSERT INTO categories (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("DB Error (create category):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/categories/:id - Update category
router.put('/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ success: true });

    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];

    await db.query(`UPDATE categories SET ${setClause} WHERE id = $1`, values);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (update category):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete category):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
