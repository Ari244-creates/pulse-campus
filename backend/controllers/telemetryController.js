const { db } = require('../config/db');

// GET /api/telemetry
exports.getTelemetry = (req, res) => {
    db.all('SELECT * FROM telemetry', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Convert array to a more useful key-value object
        const telemetry = {};
        rows.forEach(row => {
            telemetry[row.key] = {
                value: row.value,
                unit: row.unit,
                status: row.status,
                label: row.label
            };
        });

        res.json(telemetry);
    });
};

// POST /api/telemetry/update
exports.updateTelemetry = (req, res) => {
    const { key, value, status } = req.body;

    if (!key) return res.status(400).json({ error: 'Key is required' });

    // Simulated drift logic if value not provided
    db.get('SELECT * FROM telemetry WHERE key = ?', [key], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Telemetry key not found' });

        const newValue = value !== undefined ? value : simulateDrift(row.key, row.value);
        const newStatus = status || row.status;

        // Note: Our JsonDb.run handles 'UPDATE' as an insert or we need to add UPDATE support.
        // For simplicity with our current Mock API, let's just update the internal table directly if possible
        // but better to add a simple update method to JsonDb or mock it.
        // Given my JsonDb implementation is simple, I'll update it to handle "UPSERT" logic in its run method.

        db.run('INSERT INTO telemetry (key, value, status, label, unit) VALUES (?, ?, ?, ?, ?)',
            [key, newValue, newStatus, row.label, row.unit], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ key, value: newValue, status: newStatus });
            });
    });
};

const simulateDrift = (key, value) => {
    const v = parseFloat(value);
    switch (key) {
        case 'mess_crowd_index':
            return Math.min(100, Math.max(0, v + (Math.random() * 10 - 5))).toFixed(0);
        case 'solar_contribution':
            return (v + (Math.random() * 2 - 1)).toFixed(1);
        case 'power_draw':
            return (v + (Math.random() * 20 - 10)).toFixed(0);
        default:
            return value;
    }
};
