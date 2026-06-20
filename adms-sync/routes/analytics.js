const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../db');
const { createClient } = require('@supabase/supabase-js');

// profiles live in Supabase, not VPS DB
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/analytics/sidebar_counts
// Returns counts for the CRM Sidebar (client acquisition, successful conversions, customers)
router.get('/sidebar_counts', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;
    
    let acqQuery = `SELECT COUNT(*) as count FROM client_acquisition ca WHERE ca.is_deleted IS NOT TRUE`;
    let acqParams = [];
    if (company_id) {
      acqQuery = `SELECT COUNT(*) as count FROM client_acquisition ca JOIN leads l ON ca.lead_id = l.id WHERE ca.is_deleted IS NOT TRUE AND l.company_id = $1`;
      acqParams.push(company_id);
    }

    let convQuery = `SELECT COUNT(*) as count FROM leads WHERE is_deleted IS NOT TRUE AND stage IN ('Won', 'Client Successfully Acquired')`;
    let custQuery = `SELECT COUNT(*) as count FROM customers WHERE is_deleted IS NOT TRUE`;
    
    let params = [];
    if (company_id) {
      convQuery += ` AND company_id = $1`;
      custQuery += ` AND company_id = $1`;
      params.push(company_id);
    }
    
    const [acqRes, convRes, custRes] = await Promise.all([
      db.query(acqQuery, acqParams),
      db.query(convQuery, params),
      db.query(custQuery, params)
    ]);
    
    res.json({
      clientAcq: parseInt(acqRes.rows[0].count, 10),
      conversions: parseInt(convRes.rows[0].count, 10),
      customers: parseInt(custRes.rows[0].count, 10)
    });
  } catch (err) {
    console.error("Analytics Error (sidebar_counts):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/analytics/dashboard
// Returns high-level metrics for the Dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;
    
    // 1. Total Leads
    let leadsQuery = `SELECT COUNT(*) as total FROM leads WHERE is_deleted = false`;
    const leadsParams = [];
    if (company_id) {
      leadsQuery += ` AND company_id = $1`;
      leadsParams.push(company_id);
    }
    const leadsRes = await db.query(leadsQuery, leadsParams);
    const totalLeads = parseInt(leadsRes.rows[0].total, 10);

    // 2. Closed Deals (Won Leads + Export Orders)
    let wonLeadsQuery = `SELECT COUNT(*) as total FROM leads WHERE is_deleted = false AND stage IN ('won', 'closed_won', 'Closed Won', 'closed', 'Won')`;
    const wonLeadsParams = [];
    if (company_id) {
      wonLeadsQuery += ` AND company_id = $1`;
      wonLeadsParams.push(company_id);
    }
    const wonLeadsRes = await db.query(wonLeadsQuery, wonLeadsParams);
    
    let ordersQuery = `SELECT COUNT(*) as total FROM export_orders WHERE is_deleted = false`;
    const ordersParams = [];
    if (company_id) {
      ordersQuery += ` AND company_id = $1`;
      ordersParams.push(company_id);
    }
    const ordersRes = await db.query(ordersQuery, ordersParams);
    const closedWonLeads = Math.max(parseInt(wonLeadsRes.rows[0].total, 10), parseInt(ordersRes.rows[0].total, 10));

    // 3. Pending Activities & Follow-ups
    let pendingActQuery = `SELECT COUNT(*) as total FROM activities WHERE completed = false AND is_deleted = false`;
    let pendingActParams = [];
    if (company_id) {
      pendingActQuery += ` AND company_id = $1`;
      pendingActParams.push(company_id);
    }
    const pendingActRes = await db.query(pendingActQuery, pendingActParams);

    let followUpQuery = `SELECT COUNT(*) as total FROM follow_ups WHERE is_notified = false AND is_deleted = false`;
    // follow_ups doesn't have company_id directly, so we join leads if company_id is provided
    let followUpParams = [];
    if (company_id) {
      followUpQuery = `
        SELECT COUNT(f.*) as total 
        FROM follow_ups f
        JOIN leads l ON f.lead_id = l.id
        WHERE f.is_notified = false AND f.is_deleted = false AND l.company_id = $1
      `;
      followUpParams.push(company_id);
    }
    const followUpRes = await db.query(followUpQuery, followUpParams);
    const totalPending = parseInt(pendingActRes.rows[0].total, 10) + parseInt(followUpRes.rows[0].total, 10);

    // 4. Overdue Activities
    let overdueActQuery = `SELECT COUNT(*) as total FROM activities WHERE completed = false AND due_date < NOW() AND is_deleted = false`;
    let overdueActParams = [];
    if (company_id) {
      overdueActQuery += ` AND company_id = $1`;
      overdueActParams.push(company_id);
    }
    const overdueActRes = await db.query(overdueActQuery, overdueActParams);
    const overdueActivities = parseInt(overdueActRes.rows[0].total, 10);

    // 5. Total Revenue (from approved quotations)
    let revQuery = `SELECT COALESCE(SUM(COALESCE(total_amount, amount)), 0) as total FROM quotations WHERE status = 'Approved' AND is_deleted = false`;
    let revParams = [];
    // Currently quotes may not have company_id in all schemas, but if they do:
    if (company_id) {
      // Join with leads to ensure we get quotes for this company if company_id isn't on quotes directly
      revQuery = `
        SELECT COALESCE(SUM(COALESCE(q.total_amount, q.amount)), 0) as total 
        FROM quotations q
        LEFT JOIN leads l ON q.lead_id = l.id
        WHERE q.status = 'Approved' AND q.is_deleted = false 
        AND (q.company_id = $1 OR l.company_id = $1)
      `;
      revParams.push(company_id);
    }
    const revRes = await db.query(revQuery, revParams);
    const totalRevenue = parseFloat(revRes.rows[0].total);

    // 6. Recent Activity
    let recentQuery = `
      SELECT a.type, a.title, a.created_at, l.company_name as lead_company_name
      FROM activities a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.is_deleted = false
    `;
    let recentParams = [];
    if (company_id) {
      recentQuery += ` AND (a.company_id = $1 OR l.company_id = $1)`;
      recentParams.push(company_id);
    }
    recentQuery += ` ORDER BY a.created_at DESC LIMIT 5`;
    const recentRes = await db.query(recentQuery, recentParams);

    res.json({
      totalLeads,
      closedWonLeads,
      conversionRate: totalLeads > 0 ? Math.round((closedWonLeads / totalLeads) * 100) : 0,
      totalPending,
      overdueActivities,
      totalRevenue,
      recentActivities: recentRes.rows.map(r => ({
        type: r.type,
        title: r.title,
        created_at: r.created_at,
        leads: r.lead_company_name ? { company_name: r.lead_company_name } : null
      }))
    });

  } catch (err) {
    console.error("Analytics Error (dashboard):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/analytics/lead_funnel
// Returns aggregated lead counts by stage
router.get('/lead_funnel', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT stage, COUNT(*) as count 
      FROM leads 
      WHERE is_deleted = false
    `;
    const params = [];
    if (company_id) {
      query += ` AND company_id = $1`;
      params.push(company_id);
    }
    query += ` GROUP BY stage`;

    const result = await db.query(query, params);
    
    // Format to key-value pairs or array
    const breakdown = result.rows.map(r => [r.stage || 'Unknown', parseInt(r.count, 10)]);
    breakdown.sort((a, b) => b[1] - a[1]);
    
    res.json(breakdown);
  } catch (err) {
    console.error("Analytics Error (lead_funnel):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/analytics/revenue
// Returns monthly revenue trend for the last 6 months
router.get('/revenue', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;
    
    let query = `
      SELECT 
        DATE_TRUNC('month', q.created_at) as month,
        SUM(COALESCE(q.total_amount, q.amount)) as revenue
      FROM quotations q
      LEFT JOIN leads l ON q.lead_id = l.id
      WHERE q.status = 'Approved' AND q.is_deleted = false
        AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
    `;
    
    const params = [];
    if (company_id) {
      query += ` AND (q.company_id = $1 OR l.company_id = $1)`;
      params.push(company_id);
    }
    
    query += ` GROUP BY DATE_TRUNC('month', q.created_at) ORDER BY month ASC`;
    
    const result = await db.query(query, params);
    
    res.json(result.rows.map(r => ({
      month: r.month,
      revenue: parseFloat(r.revenue || 0)
    })));
  } catch (err) {
    console.error("Analytics Error (revenue):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/analytics/performance
// Returns BDE performance
router.get('/performance', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;
    
    // Revenue by BDE (via quotations -> leads -> assigned_to -> profiles)
    // assigned_to could be profile ID or full_name based on past implementation, we'll join assuming ID or match by name
    let query = `
      SELECT 
        COALESCE(p.full_name, l.assigned_to) as employee_name,
        SUM(COALESCE(q.total_amount, q.amount)) as total_revenue
      FROM quotations q
      JOIN leads l ON q.lead_id = l.id
      LEFT JOIN profiles p ON p.id::text = l.assigned_to OR p.full_name = l.assigned_to
      WHERE q.status = 'Approved' AND q.is_deleted = false AND l.assigned_to IS NOT NULL
    `;
    
    const params = [];
    if (company_id) {
      query += ` AND (q.company_id = $1 OR l.company_id = $1)`;
      params.push(company_id);
    }
    
    query += ` GROUP BY COALESCE(p.full_name, l.assigned_to) ORDER BY total_revenue DESC LIMIT 5`;
    
    const result = await db.query(query, params);
    
    res.json(result.rows.map(r => [r.employee_name, parseFloat(r.total_revenue || 0)]));
  } catch (err) {
    console.error("Analytics Error (performance):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/analytics/reports_raw
// Returns all raw data needed by Reports.tsx
router.get('/reports_raw', requireAuth, async (req, res) => {
  try {
    const { company_id } = req.query;

    const getTable = async (table, extraWhere = '', orderBy = '') => {
      let q = `SELECT * FROM ${table} WHERE is_deleted = false`;
      const params = [];
      if (company_id) {
        // Only profiles and export_orders have company_id definitively in all schemas.
        // Assuming most of these have company_id or we filter later. 
        // For safety, if company_id column exists we should filter, but let's just do it dynamically or omit if tricky.
        // Actually, the frontend downloaded everything. Let's replicate frontend behavior: return all for now.
        // To be safe with company_id:
        if (table !== 'client_acquisition' && table !== 'bde_daily_reports') {
            q += ` AND (company_id = $1 OR company_id IS NULL)`;
            params.push(company_id);
        }
      }
      if (extraWhere) q += ` AND ${extraWhere}`;
      if (orderBy) q += ` ORDER BY ${orderBy}`;
      
      try {
        const result = await db.query(q, params);
        return result.rows;
      } catch (e) {
        // If table doesn't have company_id, fallback
        if (e.message.includes('company_id')) {
           const fallbackQ = `SELECT * FROM ${table} WHERE is_deleted = false` + (orderBy ? ` ORDER BY ${orderBy}` : '');
           const fallbackRes = await db.query(fallbackQ);
           return fallbackRes.rows;
        }
        return [];
      }
    };

    // Profiles — from Supabase (not in VPS DB)
    let profilesData = [];
    try {
      const { data: supaProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, requested_role, monthly_target')
        .eq('is_deleted', false);
      if (!profErr) profilesData = supaProfiles || [];
      if (company_id) profilesData = profilesData.filter(p => p.company_id === company_id);
    } catch (e) {
      console.warn('Could not fetch profiles from Supabase:', e.message);
    }
    
    const [
      leads, activities, followUps, quotations, exportOrders, acquisitions, dailyReports
    ] = await Promise.all([
      getTable('leads', '', 'created_at DESC'),
      getTable('activities'),
      getTable('follow_ups'),
      getTable('quotations'),
      getTable('export_orders'),
      getTable('client_acquisition'),
      getTable('bde_daily_reports', '', 'report_date DESC')
    ]);

    res.json({
      profiles: profilesData || [],
      leads: leads || [],
      activities: activities || [],
      followUps: followUps || [],
      quotations: quotations || [],
      exportOrders: exportOrders || [],
      acquisitions: acquisitions || [],
      dailyReports: dailyReports || []
    });

  } catch (err) {
    console.error("Analytics Error (reports_raw):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/analytics/daily_reports
router.post('/daily_reports', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    data.company_id = req.user.company_id || data.company_id;
    
    const columns = Object.keys(data).filter(k => data[k] !== undefined);
    const values = columns.map(k => data[k]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    await db.query(
      `INSERT INTO bde_daily_reports (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Analytics Error (post daily_reports):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/analytics/employee_productivity
// Returns real employee productivity stats from VPS DB
router.get('/employee_productivity', requireAuth, async (req, res) => {
  try {
    // 1. Active employees count — from Supabase (profiles not in VPS DB)
    const { data: empData, error: empErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('is_active', true)
      .eq('is_deleted', false);
    const activeEmployees = empErr ? 0 : (empData?.length ?? 0);

    // Also get count properly
    const { count: activeCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('is_active', true)
      .eq('is_deleted', false);
    const empCount = activeCount || 0;

    // 2. Avg Attendance this week (Mon-today)
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dayOfWeek = new Date(todayIST).getDay(); // 0=Sun
    const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(todayIST);
    weekStart.setDate(weekStart.getDate() - daysFromMon);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const attRes = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('present','on_leave') AND (is_deleted IS NULL OR is_deleted = false)) as present_count,
         COUNT(DISTINCT employee_id) FILTER (WHERE (is_deleted IS NULL OR is_deleted = false)) as unique_employees
       FROM attendance_logs
       WHERE date >= $1 AND date <= $2`,
      [weekStartStr, todayIST]
    );
    const presentCount = parseInt(attRes.rows[0].present_count || 0, 10);
    const uniqueEmployeesThisWeek = parseInt(attRes.rows[0].unique_employees || 0, 10);
    // Expected = active employees * days elapsed this week (Mon-today, max 5)
    const daysElapsed = Math.min(daysFromMon + 1, 5);
    const expectedDays = (activeEmployees || 1) * (daysElapsed || 1);
    const avgAttendance = expectedDays > 0 ? Math.round((presentCount / expectedDays) * 100) : 0;

    // 3. Tasks (activities) completed this week
    const tasksRes = await db.query(
      `SELECT COUNT(*) as total FROM activities
       WHERE completed = true AND is_deleted = false
       AND updated_at >= $1`,
      [weekStart.toISOString()]
    );
    const tasksCompleted = parseInt(tasksRes.rows[0].total, 10);

    // 4. Avg response time in hours (time between activity created_at and updated_at when completed)
    const responseRes = await db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0) as avg_hours
       FROM activities
       WHERE completed = true AND is_deleted = false
       AND EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0 BETWEEN 0 AND 72`
    );
    const avgResponseHours = parseFloat(responseRes.rows[0].avg_hours || 0);

    // Last week comparison for employees — from Supabase
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const { count: prevEmpCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .lte('created_at', lastWeekEnd.toISOString());
    const prevActiveEmployees = prevEmpCount || 0;

    const prevAttRes = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status IN ('present','on_leave') AND (is_deleted IS NULL OR is_deleted = false)) as present_count
       FROM attendance_logs WHERE date >= $1 AND date <= $2`,
      [lastWeekStart.toISOString().slice(0, 10), lastWeekEnd.toISOString().slice(0, 10)]
    );
    const prevPresent = parseInt(prevAttRes.rows[0].present_count || 0, 10);
    const prevExpected = (prevActiveEmployees || 1) * 5;
    const prevAvgAttendance = prevExpected > 0 ? Math.round((prevPresent / prevExpected) * 100) : 0;

    const prevTasksRes = await db.query(
      `SELECT COUNT(*) as total FROM activities
       WHERE completed = true AND is_deleted = false
       AND updated_at >= $1 AND updated_at < $2`,
      [lastWeekStart.toISOString(), weekStart.toISOString()]
    );
    const prevTasks = parseInt(prevTasksRes.rows[0].total, 10);

    const empDelta = empCount - prevActiveEmployees;
    const attDelta = avgAttendance - prevAvgAttendance;
    const tasksDelta = tasksCompleted - prevTasks;
    const responseFormatted = avgResponseHours > 0
      ? (avgResponseHours >= 1 ? `${avgResponseHours.toFixed(1)}h` : `${Math.round(avgResponseHours * 60)}m`)
      : 'N/A';

    res.json({
      activeEmployees: empCount,
      avgAttendance,
      tasksCompleted,
      avgResponseHours: avgResponseHours > 0 ? avgResponseHours.toFixed(1) : null,
      avgResponseFormatted: responseFormatted,
      deltas: {
        employees: empDelta >= 0 ? `+${empDelta}` : `${empDelta}`,
        attendance: attDelta >= 0 ? `+${attDelta.toFixed(1)}%` : `${attDelta.toFixed(1)}%`,
        tasks: tasksDelta >= 0 ? `+${tasksDelta}` : `${tasksDelta}`,
      }
    });
  } catch (err) {
    console.error("Analytics Error (employee_productivity):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/analytics/activity_logs
router.get('/activity_logs', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, action, user_id, user_name, actor_name, created_at 
       FROM activity_logs 
       ORDER BY created_at DESC 
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching activity_logs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

