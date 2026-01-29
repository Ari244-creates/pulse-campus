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
    // Manually join since mock DB is limited
    db.all('SELECT * FROM spaces', [], (err, spaces) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT * FROM occupancy_logs', [], (err, logs) => {
            if (err) return res.status(500).json({ error: err.message });

            const results = spaces.map(space => {
                // Find latest log for this space
                const spaceLogs = logs.filter(l => l.space_id === space.id);
                const latestLog = spaceLogs.length > 0
                    ? spaceLogs.sort((a, b) => b.id - a.id)[0]
                    : null;

                const current_count = latestLog ? latestLog.current_count : 0;
                const utilization = parseFloat((current_count / space.capacity).toFixed(2));

                return {
                    space_id: space.id,
                    space_name: space.name,
                    current_count: current_count,
                    capacity: space.capacity,
                    utilization: utilization
                };
            });

            res.json(results);
        });
    });
};

// GET /api/occupancy/heatmap
exports.getHeatmapData = (req, res) => {
    // Manually join since mock DB is limited
    db.all('SELECT * FROM spaces', [], (err, spaces) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT * FROM occupancy_logs', [], (err, logs) => {
            if (err) return res.status(500).json({ error: err.message });

            const results = spaces.map(space => {
                const spaceLogs = logs.filter(l => l.space_id === space.id);
                const latestLog = spaceLogs.length > 0
                    ? spaceLogs.sort((a, b) => b.id - a.id)[0]
                    : null;

                const current_count = latestLog ? latestLog.current_count : 0;
                const occupancy_percentage = (current_count / space.capacity) * 100;

                return {
                    name: space.name,
                    occupancy_percentage: occupancy_percentage
                };
            });

            res.json(results);
        });
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
