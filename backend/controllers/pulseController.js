/**
 * PulseCampus Controller
 * 
 * Handles sensing (occupancy updates) and predictions.
 */

const { db } = require('../config/db');
const { predictOccupancy } = require('../services/predictionService');
const { generateOccupancy } = require('../utils/simulation');

// GET /api/spaces
exports.getSpaces = (req, res) => {
    db.all('SELECT * FROM spaces', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// POST /api/occupancy/update
exports.updateOccupancy = (req, res) => {
    const { space_id, current_count } = req.body;

    if (space_id === undefined) return res.status(400).json({ error: 'space_id is required' });

    // Use current_count if provided, otherwise generate it (simulation mode)
    let count = current_count;
    if (count === undefined && process.env.SYSTEM_MODE === 'SIMULATION') {
        // Get capacity first
        db.get('SELECT capacity FROM spaces WHERE id = ?', [space_id], (err, row) => {
            if (err || !row) return res.status(404).json({ error: 'Space not found' });
            count = generateOccupancy(row.capacity);
            saveLog(space_id, count, res);
        });
    } else {
        saveLog(space_id, count || 0, res);
    }
};

const saveLog = (space_id, count, res) => {
    db.run(
        'INSERT INTO occupancy_logs (space_id, current_count) VALUES (?, ?)',
        [space_id, count],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, space_id, current_count: count, timestamp: new Date().toISOString() });
        }
    );
};

// GET /api/occupancy/current
exports.getCurrentOccupancy = (req, res) => {
    const query = `
    SELECT s.id as space_id, s.name as space_name, l.current_count, s.capacity
    FROM spaces s
    LEFT JOIN (
      SELECT space_id, current_count
      FROM occupancy_logs
      WHERE id IN (SELECT MAX(id) FROM occupancy_logs GROUP BY space_id)
    ) l ON s.id = l.space_id
  `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const results = rows.map(row => ({
            ...row,
            utilization: row.current_count ? parseFloat((row.current_count / row.capacity).toFixed(2)) : 0
        }));

        res.json(results);
    });
};

// GET /api/occupancy/heatmap
exports.getHeatmapData = (req, res) => {
    const query = `
    SELECT s.name, (CAST(l.current_count AS REAL) / s.capacity) * 100 as occupancy_percentage
    FROM spaces s
    JOIN (
      SELECT space_id, current_count
      FROM occupancy_logs
      WHERE id IN (SELECT MAX(id) FROM occupancy_logs GROUP BY space_id)
    ) l ON s.id = l.space_id
  `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// GET /api/predictions/next
exports.getPredictions = async (req, res) => {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);

    try {
        db.all('SELECT id, name, capacity FROM spaces', async (err, spaces) => {
            if (err) throw err;

            const results = [];
            for (const space of spaces) {
                const prediction = await predictOccupancy(space.id, nextHour);
                results.push({
                    space_id: space.id,
                    predicted_count: prediction.predicted_count,
                    capacity: space.capacity,
                    confidence: parseFloat(prediction.confidence.toFixed(2)),
                    prediction_time: nextHour.toISOString()
                });
            }
            res.json(results);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Simulation helper for periodic updates
exports.runSimulationStep = () => {
    db.all('SELECT id, capacity FROM spaces', [], (err, spaces) => {
        if (err || !spaces) return;

        spaces.forEach(space => {
            const count = generateOccupancy(space.capacity);
            db.run(
                'INSERT INTO occupancy_logs (space_id, current_count) VALUES (?, ?)',
                [space.id, count],
                () => { }
            );
        });
    });
};
