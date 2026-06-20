const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET active vehicles
router.get('/vehicles', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT id, vehicle_number, vehicle_type 
            FROM vehicles 
            WHERE is_active = true AND is_deleted IS NOT TRUE
            ORDER BY vehicle_number ASC
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching vehicles:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET active drivers
router.get('/drivers', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT id, name, license_number 
            FROM drivers 
            WHERE is_active = true AND is_deleted IS NOT TRUE
            ORDER BY name ASC
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching drivers:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET shipment_dispatches count
router.get('/shipment_dispatches/count', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT COUNT(*) as count FROM shipment_dispatches`);
        res.json({ count: parseInt(rows[0].count) });
    } catch (err) {
        console.error("Error getting dispatches count:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST create shipment dispatch
router.post('/shipment_dispatches', requireAuth, async (req, res) => {
    try {
        const { vehicle_id, driver_id, schedule_start, schedule_end, status } = req.body;
        const query = `
            INSERT INTO shipment_dispatches (vehicle_id, driver_id, schedule_start, schedule_end, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING *
        `;
        const values = [vehicle_id, driver_id, schedule_start, schedule_end, status];
        const { rows } = await db.query(query, values);
        
        if (rows.length === 0) {
            return res.status(400).json({ error: "Failed to create shipment dispatch" });
        }
        
        const shipment = rows[0];
        
        // Update with gate pass token
        const token = `SHIP-${shipment.id}-${Date.now()}`;
        const updateQuery = `
            UPDATE shipment_dispatches 
            SET gate_pass_token = $1 
            WHERE id = $2 
            RETURNING *
        `;
        const updateRes = await db.query(updateQuery, [token, shipment.id]);
        
        res.json(updateRes.rows[0]);
    } catch (err) {
        console.error("Error creating shipment dispatch:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
