const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../db');

// GET /api/quotations
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT q.*, c.name as customer_name
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      ORDER BY q.created_at DESC
    `);
    
    // Map customer_name into customers object for frontend compatibility
    const formattedRows = rows.map(row => {
      const { customer_name, ...quotation } = row;
      return {
        ...quotation,
        customers: customer_name ? { name: customer_name } : null
      };
    });

    res.json(formattedRows);
  } catch (err) {
    console.error("DB Error (get all quotations):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/quotations/public/:id
router.get('/public/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT q.*, 
              c.name as customer_name, c.address as customer_address, c.phone as customer_phone, c.email as customer_email
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    const row = result.rows[0];
    const { customer_name, customer_address, customer_phone, customer_email, ...quotation } = row;

    const itemsResult = await db.query(
      `SELECT qi.*, 
              p.name as product_name, p.sku as product_sku, p.unit as product_unit, p.hs_code as product_hs_code
       FROM quotation_items qi
       LEFT JOIN products p ON qi.product_id = p.id
       WHERE qi.quotation_id = $1 AND qi.is_deleted = false
       ORDER BY qi.created_at`,
      [req.params.id]
    );

    const items = itemsResult.rows.map(itemRow => {
      const { product_name, product_sku, product_unit, product_hs_code, ...item } = itemRow;
      return {
        ...item,
        product: product_name ? {
          name: product_name,
          sku: product_sku,
          unit: product_unit,
          hs_code: product_hs_code
        } : null
      };
    });

    res.json({
      ...quotation,
      customers: customer_name ? {
        name: customer_name,
        address: customer_address,
        phone: customer_phone,
        email: customer_email
      } : null,
      items
    });
  } catch (err) {
    console.error("DB Error (get public quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// GET /api/quotations/approved
router.get('/approved', requireAuth, async (req, res) => {
  try {
    const qResult = await db.query(`
      SELECT q.*, c.name as customer_name, c.country as customer_country
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.status = 'Approved' AND q.is_deleted = false
      ORDER BY q.created_at DESC
    `);
    
    if (qResult.rows.length === 0) {
      return res.json([]);
    }

    const qIds = qResult.rows.map(q => q.id);
    const placeholders = qIds.map((_, i) => `$${i + 1}`).join(', ');

    const itemsResult = await db.query(`
      SELECT qi.*, p.name as product_name, p.unit as product_unit
      FROM quotation_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      WHERE qi.quotation_id IN (${placeholders}) AND qi.is_deleted = false
    `, qIds);

    const formattedRows = qResult.rows.map(row => {
      const { customer_name, customer_country, ...quotation } = row;
      
      const qItems = itemsResult.rows.filter(i => i.quotation_id === quotation.id).map(i => ({
        ...i,
        quantity: Number(i.quantity),
        products: { name: i.product_name, unit: i.product_unit }
      }));

      return {
        ...quotation,
        customer: customer_name ? { name: customer_name, country: customer_country } : null,
        items: qItems
      };
    });

    res.json(formattedRows);
  } catch (err) {
    console.error("DB Error (get approved quotations):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/quotations/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT q.*, 
              c.name as customer_name, c.address as customer_address, c.phone as customer_phone
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    const row = result.rows[0];
    const { customer_name, customer_address, customer_phone, ...quotation } = row;

    res.json({
      ...quotation,
      customers: customer_name ? {
        name: customer_name,
        address: customer_address,
        phone: customer_phone
      } : null
    });
  } catch (err) {
    console.error("DB Error (get quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/quotations/:id/items
router.get('/:id/items', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT qi.*, 
              p.name as product_name, p.sku as product_sku, p.unit as product_unit, p.hs_code as product_hs_code
       FROM quotation_items qi
       LEFT JOIN products p ON qi.product_id = p.id
       WHERE qi.quotation_id = $1 AND qi.is_deleted = false
       ORDER BY qi.created_at`,
      [req.params.id]
    );

    const formattedRows = result.rows.map(row => {
      const { product_name, product_sku, product_unit, product_hs_code, ...item } = row;
      return {
        ...item,
        product: product_name ? {
          name: product_name,
          sku: product_sku,
          unit: product_unit,
          hs_code: product_hs_code
        } : null
      };
    });

    res.json(formattedRows);
  } catch (err) {
    console.error("DB Error (get quotation items):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/quotations
router.post('/', requireAuth, async (req, res) => {
  try {
    const { quotation, items } = req.body;
    
    await db.query('BEGIN');

    // Create quotation
    if (!quotation.quotation_number) {
      const currentYear = new Date().getFullYear();
      const countRes = await db.query(
        `SELECT COUNT(id) as count FROM quotations WHERE company_id = $1 AND quotation_number ILIKE $2`,
        [quotation.company_id, `QT-${currentYear}-%`]
      );
      const nextNum = (parseInt(countRes.rows[0].count) + 1).toString().padStart(4, '0');
      quotation.quotation_number = `QT-${currentYear}-${nextNum}`;
    }

    const qCols = Object.keys(quotation).filter(k => quotation[k] !== undefined);
    const qVals = qCols.map(k => quotation[k]);
    const qPlaceholders = qCols.map((_, i) => `$${i + 1}`).join(', ');

    const qRes = await db.query(
      `INSERT INTO quotations (${qCols.join(', ')}) VALUES (${qPlaceholders}) RETURNING *`,
      qVals
    );
    const qData = qRes.rows[0];

    // Attach items
    if (items && items.length > 0) {
      for (const item of items) {
        const itemCols = Object.keys(item).filter(k => item[k] !== undefined);
        const itemVals = itemCols.map(k => item[k]);
        
        itemCols.push('quotation_id');
        itemVals.push(qData.id);
        
        const itemPlaceholders = itemCols.map((_, i) => `$${i + 1}`).join(', ');

        await db.query(
          `INSERT INTO quotation_items (${itemCols.join(', ')}) VALUES (${itemPlaceholders})`,
          itemVals
        );
      }
    }

    await db.query('COMMIT');
    res.status(201).json(qData);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error("DB Error (create quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/quotations/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { quotation, itemsToUpdate, itemsToInsert, itemsToDelete } = req.body;

    await db.query('BEGIN');

    // Update quotation
    if (quotation && Object.keys(quotation).length > 0) {
      const setClauses = [];
      const values = [];
      let idx = 1;

      for (const [key, value] of Object.entries(quotation)) {
        setClauses.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
      values.push(req.params.id);

      await db.query(
        `UPDATE quotations SET ${setClauses.join(', ')} WHERE id = $${idx}`,
        values
      );
    }

    // Delete items
    if (itemsToDelete && itemsToDelete.length > 0) {
      const placeholders = itemsToDelete.map((_, i) => `$${i + 1}`).join(', ');
      await db.query(
        `UPDATE quotation_items SET is_deleted = true, deleted_at = NOW() WHERE id IN (${placeholders}) AND quotation_id = $${itemsToDelete.length + 1}`,
        [...itemsToDelete, req.params.id]
      );
    }

    // Update items
    if (itemsToUpdate && itemsToUpdate.length > 0) {
      for (const item of itemsToUpdate) {
        const setClauses = [];
        const values = [];
        let idx = 1;
        const itemId = item.id;
        
        const itemCopy = { ...item };
        delete itemCopy.id;

        for (const [key, value] of Object.entries(itemCopy)) {
          setClauses.push(`${key} = $${idx}`);
          values.push(value);
          idx++;
        }
        values.push(itemId);

        await db.query(
          `UPDATE quotation_items SET ${setClauses.join(', ')} WHERE id = $${idx}`,
          values
        );
      }
    }

    // Insert new items
    if (itemsToInsert && itemsToInsert.length > 0) {
      for (const item of itemsToInsert) {
        const itemCols = Object.keys(item).filter(k => item[k] !== undefined);
        const itemVals = itemCols.map(k => item[k]);
        
        itemCols.push('quotation_id');
        itemVals.push(req.params.id);
        
        const itemPlaceholders = itemCols.map((_, i) => `$${i + 1}`).join(', ');

        await db.query(
          `INSERT INTO quotation_items (${itemCols.join(', ')}) VALUES (${itemPlaceholders})`,
          itemVals
        );
      }
    }

    await db.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error("DB Error (update quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE quotations SET is_deleted = true, deleted_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error (delete quotation):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
