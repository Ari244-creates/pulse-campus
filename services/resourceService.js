/**
 * Resource Service
 * 
 * Logic for conflict detection and resource reassignment.
 */

const { db } = require('../config/db');
const { predictOccupancy } = require('./predictionService');

/**
 * Evaluates a space for potential conflict (occupancy > 85%)
 */
const checkConflict = (predictedCount, capacity) => {
    const utilization = (predictedCount / capacity) * 100;
    return utilization > 85;
};

/**
 * Finds the best alternative space for an event
 */
const findAlternativeSpace = async (originalSpaceId, requiredCapacity, startTime) => {
    return new Promise((resolve, reject) => {
        // Find all spaces other than the original one that can fit the capacity
        db.all(
            'SELECT * FROM spaces WHERE id != ? AND capacity >= ?',
            [originalSpaceId, requiredCapacity],
            async (err, spaces) => {
                if (err) return reject(err);
                if (spaces.length === 0) return resolve(null);

                const spaceUtilization = [];

                for (const space of spaces) {
                    const prediction = await predictOccupancy(space.id, startTime);
                    const util = (prediction.predicted_count / space.capacity);
                    spaceUtilization.push({ space, util });
                }

                // Sort by lowest utilization
                spaceUtilization.sort((a, b) => a.util - b.util);

                resolve(spaceUtilization[0].space);
            }
        );
    });
};

module.exports = { checkConflict, findAlternativeSpace };
