/**
 * Resource Controller
 * 
 * Handles events and reassignment logic.
 */

const { db } = require('../config/db');
const { predictOccupancy } = require('../services/predictionService');
const { checkConflict, findAlternativeSpace } = require('../services/resourceService');

/**
 * Helper: log every decision (SAFE / NO_ACTION / REASSIGNED)
 */
const logDecision = (event_id, from_space_id, to_space_id, reason) => {
    db.run(
        'INSERT INTO reassignment_logs (event_id, from_space_id, to_space_id, reason) VALUES (?, ?, ?, ?)',
        [event_id, from_space_id, to_space_id, reason]
    );
};

// GET /api/events
exports.getEvents = (req, res) => {
    db.all(
        'SELECT id, name, priority, space_id, start_time, end_time FROM events',
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
};

// POST /api/events/create
exports.createEvent = (req, res) => {
    const { name, priority, space_id, start_time, end_time } = req.body;

    db.run(
        'INSERT INTO events (name, priority, space_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
        [name, priority, space_id, start_time, end_time],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name, priority, space_id, start_time, end_time });
        }
    );
};

// POST /api/resource/evaluate
exports.evaluateResource = async (req, res) => {
    const { event_id } = req.body;

    if (!event_id) {
        return res.status(400).json({ error: 'event_id is required' });
    }

    db.get(
        `
        SELECT 
            e.*, 
            s.capacity, 
            s.name AS space_name 
        FROM events e 
        JOIN spaces s ON e.space_id = s.id 
        WHERE e.id = ?
        `,
        [event_id],
        async (err, event) => {
            if (err || !event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            try {
                const prediction = await predictOccupancy(event.space_id, event.start_time);
                const utilization = ((prediction.predicted_count / event.capacity) * 100).toFixed(0);
                const isConflict = checkConflict(prediction.predicted_count, event.capacity);

                // ✅ SAFE CASE
                if (!isConflict) {
                    logDecision(
                        event.id,
                        event.space_id,
                        event.space_id,
                        `SAFE: Predicted occupancy ${utilization}% within capacity`
                    );

                    return res.json({
                        decision: "SAFE",
                        space: event.space_name,
                        reason: `Predicted occupancy is ${utilization}%, which is within safe capacity limits.`
                    });
                }

                // 🔍 Find alternative space
                const alternative = await findAlternativeSpace(
                    event.space_id,
                    event.capacity,
                    event.start_time
                );

                // ❌ NO ACTION CASE
                if (!alternative) {
                    logDecision(
                        event.id,
                        event.space_id,
                        event.space_id,
                        "NO_ACTION: No suitable alternative space available"
                    );

                    return res.json({
                        decision: "NO_ACTION",
                        reason: "No suitable alternative space available without disrupting higher priority events."
                    });
                }

                // 🔁 REASSIGNED CASE
                const altPrediction = await predictOccupancy(alternative.id, event.start_time);
                const altUtil = ((altPrediction.predicted_count / alternative.capacity) * 100).toFixed(0);

                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    db.run(
                        'UPDATE events SET space_id = ? WHERE id = ?',
                        [alternative.id, event_id]
                    );

                    db.run(
                        'INSERT INTO reassignment_logs (event_id, from_space_id, to_space_id, reason) VALUES (?, ?, ?, ?)',
                        [
                            event_id,
                            event.space_id,
                            alternative.id,
                            `Predicted overload (${utilization}%)`
                        ]
                    );

                    db.run('COMMIT', (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }

                        res.json({
                            decision: "REASSIGNED",
                            from: event.space_name,
                            to: alternative.name,
                            reason: `${event.space_name} is predicted to exceed safe capacity (${utilization}%). ${alternative.name} is underutilized (${altUtil}%) and can safely accommodate the event.`
                        });
                    });
                });

            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        }
    );
};

// POST /api/resource/reassign
exports.reassignResource = (req, res) => {
    const { event_id, to_space_id, reason } = req.body;

    db.get(
        'SELECT space_id FROM events WHERE id = ?',
        [event_id],
        (err, event) => {
            if (err || !event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const from_space_id = event.space_id;

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                db.run(
                    'UPDATE events SET space_id = ? WHERE id = ?',
                    [to_space_id, event_id]
                );

                db.run(
                    'INSERT INTO reassignment_logs (event_id, from_space_id, to_space_id, reason) VALUES (?, ?, ?, ?)',
                    [event_id, from_space_id, to_space_id, reason]
                );

                db.run('COMMIT', (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    res.json({
                        status: 'REASSIGNED',
                        event_id,
                        from_space_id,
                        to_space_id,
                        reason
                    });
                });
            });
        }
    );
};

// GET /api/resource/history
// GET /api/resource/history
exports.getDecisionHistory = (req, res) => {
    const query = `
        SELECT 
            e.name AS event_name,
            s1.name AS from_space,
            s2.name AS to_space,
            l.reason,
            l.timestamp
        FROM reassignment_logs l
        LEFT JOIN events e ON l.event_id = e.id
        LEFT JOIN spaces s1 ON l.from_space_id = s1.id
        LEFT JOIN spaces s2 ON l.to_space_id = s2.id
        ORDER BY l.timestamp DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};
