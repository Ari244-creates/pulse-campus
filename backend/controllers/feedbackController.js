/**
 * Feedback Controller
 * 
 * Verifies accuracy and provides metric visualization data.
 */

const { db } = require('../config/db');

// POST /api/feedback/evaluate
exports.evaluateFeedback = (req, res) => {
    const { space_id, actual_count } = req.body;

    if (space_id === undefined || actual_count === undefined) {
        return res.status(400).json({ error: 'space_id and actual_count are required' });
    }

    // Get the most recent prediction for this space
    db.get(
        'SELECT * FROM predictions WHERE space_id = ? ORDER BY id DESC LIMIT 1',
        [space_id],
        (err, prediction) => {
            if (err || !prediction) return res.status(404).json({ error: 'No recent prediction found for this space' });

            const error_margin = Math.abs(prediction.predicted_count - actual_count);
            const accuracy = actual_count > 0 ? parseFloat((1 - (error_margin / Math.max(actual_count, prediction.predicted_count))).toFixed(2)) : 1;

            db.run(
                'INSERT INTO accuracy_metrics (space_id, prediction_id, actual_count, error_margin) VALUES (?, ?, ?, ?)',
                [space_id, prediction.id, actual_count, error_margin],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({
                        space_id,
                        predicted: prediction.predicted_count,
                        actual: actual_count,
                        accuracy: accuracy
                    });
                }
            );
        }
    );
};

// GET /api/feedback/metrics
exports.getMetrics = (req, res) => {
    const query = `
    SELECT s.name, AVG(error_margin) as avg_error, COUNT(*) as sample_size
    FROM accuracy_metrics m
    JOIN spaces s ON m.space_id = s.id
    GROUP BY m.space_id
  `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};
