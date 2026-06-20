const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/procurement/dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;
    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    // 1. Total Suppliers (Farmers)
    const supRes = await db.query(
      `SELECT COUNT(*) as total FROM farmers WHERE company_id = $1 AND is_deleted IS NOT TRUE`,
      [company_id]
    );
    const totalSuppliers = parseInt(supRes.rows[0].total, 10);

    // 2. All Purchase Orders
    const poRes = await db.query(
      `SELECT po.id, po.status, po.total, po.order_date, f.full_name as supplier_name 
       FROM purchase_orders po
       LEFT JOIN farmers f ON po.farmer_id = f.id
       WHERE po.company_id = $1 AND po.is_deleted IS NOT TRUE`,
      [company_id]
    );

    const pos = poRes.rows;

    // 3. Calculate PO value this month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const totalPOValueMonth = pos
      .filter(po => new Date(po.order_date) >= thisMonthStart)
      .reduce((sum, po) => sum + (Number(po.total) || 0), 0);

    // 4. Calculate top 5 suppliers
    const supplierTotals = {};
    pos.forEach(po => {
      const supName = po.supplier_name || "Unknown Supplier";
      if (!supplierTotals[supName]) supplierTotals[supName] = { name: supName, value: 0 };
      supplierTotals[supName].value += Number(po.total) || 0;
    });

    const topSuppliers = Object.values(supplierTotals)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 5. Status breakdown
    const statusCounts = {};
    pos.forEach(po => {
      const status = po.status || 'draft';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));

    res.json({
      totalSuppliers,
      totalPOValueMonth,
      topSuppliers,
      statusData: statusChartData
    });
  } catch (err) {
    console.error('DB Error (procurement dashboard):', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

module.exports = router;
