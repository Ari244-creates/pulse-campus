/**
 * Prediction Service
 * 
 * Logic for predicting future occupancy.
 * Designed as a pluggable module.
 */

const { db } = require('../config/db');

/**
 * Predicts occupancy for a specific space at a given time.
 * Logic: Simple rolling average of last 5 logs + a time-weighted factor.
 * In the future, this function can be replaced with a call to an ML model/microservice.
 * 
 * @param {number} spaceId 
 * @param {Date} targetTime 
 * @returns {Promise<Object>} Object containing predicted_count and confidence
 */
const predictOccupancy = async (spaceId, targetTime) => {
    return new Promise((resolve, reject) => {
        // 1. Get capacity of the space
        db.get('SELECT capacity FROM spaces WHERE id = ?', [spaceId], (err, space) => {
            if (err || !space) return reject(err || new Error('Space not found'));

            // 2. Get last 5 historical records
            db.all(
                'SELECT current_count FROM occupancy_logs WHERE space_id = ? ORDER BY timestamp DESC LIMIT 5',
                [spaceId],
                (err, logs) => {
                    if (err) return reject(err);

                    let avgCount = 0;
                    if (logs.length > 0) {
                        avgCount = logs.reduce((sum, log) => sum + log.current_count, 0) / logs.length;
                    } else {
                        // Initial fallback if no logs
                        avgCount = space.capacity * 0.2;
                    }

                    // 3. Apply time-weighted factor (Simulated ML logic)
                    // E.g., if it's peak hour, increase the prediction
                    const hour = new Date(targetTime).getHours();
                    let multiplier = 1.0;

                    if (hour >= 9 && hour <= 11) multiplier = 1.2; // Morning peak
                    else if (hour >= 18 && hour <= 20) multiplier = 1.1; // Evening peak
                    else if (hour >= 23 || hour <= 6) multiplier = 0.5; // Night off-peak

                    const predicted_count = Math.min(space.capacity, Math.round(avgCount * multiplier));

                    // Confidence decreases as we predict further into the future (not used here but good for API)
                    const confidence = logs.length > 3 ? 0.85 : 0.6;

                    resolve({
                        predicted_count,
                        confidence
                    });
                }
            );
        });
    });
};

/**
 * Batch update predictions for all spaces for the next hour
 */
const updateAllPredictions = async () => {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
        db.all('SELECT id FROM spaces', async (err, spaces) => {
            if (err) return reject(err);

            try {
                for (const space of spaces) {
                    const prediction = await predictOccupancy(space.id, nextHour);

                    db.run(
                        'INSERT INTO predictions (space_id, predicted_count, prediction_time, confidence) VALUES (?, ?, ?, ?)',
                        [space.id, prediction.predicted_count, nextHour.toISOString(), prediction.confidence]
                    );
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
};

module.exports = { predictOccupancy, updateAllPredictions };
