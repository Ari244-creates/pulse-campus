/**
 * Simulation Utility
 * Generates realistic occupancy patterns based on time and space type.
 */

const generateOccupancy = (capacity, timestamp = new Date()) => {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let basePercentage = 0;

    if (isWeekend) {
        // Weekends: Lower general occupancy, lunch peaks
        if (hour >= 10 && hour <= 14) basePercentage = 0.3 + Math.random() * 0.2;
        else if (hour > 14 && hour < 20) basePercentage = 0.2 + Math.random() * 0.1;
        else basePercentage = 0.05 + Math.random() * 0.05;
    } else {
        // Weekdays: High occupancy during class hours
        if (hour >= 8 && hour <= 12) basePercentage = 0.7 + Math.random() * 0.25; // Morning rush
        else if (hour > 12 && hour <= 14) basePercentage = 0.5 + Math.random() * 0.3; // Lunch
        else if (hour > 14 && hour <= 18) basePercentage = 0.6 + Math.random() * 0.2; // Afternoon
        else if (hour > 18 && hour <= 22) basePercentage = 0.2 + Math.random() * 0.2; // Evening study
        else basePercentage = 0.02 + Math.random() * 0.05; // Night
    }

    // Ensure it doesn't exceed 100% too often in simulation, but allow for peak overflows
    const count = Math.floor(capacity * basePercentage);
    return Math.max(0, count);
};

module.exports = { generateOccupancy };
