const { db, initDB } = require('../config/db');
const { generateOccupancy } = require('../utils/simulation');

const seed = async () => {
    try {
        await initDB();

        // Explicitly clear tables for seeding
        await new Promise((resolve) => db.exec('DELETE', resolve));

        console.log('Seeding JSON Database...');

        const spaces = [
            { name: 'Grand Library', type: 'library', capacity: 200 },
            { name: 'Room A-101', type: 'classroom', capacity: 40 },
            { name: 'Main Auditorium', type: 'hall', capacity: 500 },
            { name: 'Science Lab 1', type: 'classroom', capacity: 30 },
            { name: 'Student Lounge', type: 'hall', capacity: 100 },
            { name: 'Computing Lab B', type: 'classroom', capacity: 50 }
        ];

        // Seed Spaces
        for (const s of spaces) {
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO spaces (name, type, capacity) VALUES (?, ?, ?)',
                    [s.name, s.type, s.capacity], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        }
        console.log('Spaces seeded.');

        // Get seeded spaces
        const rows = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM spaces', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Insert initial occupancy logs
        for (const row of rows) {
            const count = generateOccupancy(row.capacity);
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO occupancy_logs (space_id, current_count) VALUES (?, ?)',
                    [row.id, count], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        }
        console.log('Initial occupancy logs seeded.');

        // Insert sample events
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        await new Promise((resolve, reject) => {
            db.run('INSERT INTO events (name, priority, space_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
                ['Physics Final Exam', 'exam', rows[1].id, now.toISOString(), twoHoursLater.toISOString()], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });

        await new Promise((resolve, reject) => {
            db.run('INSERT INTO events (name, priority, space_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
                ['Web Dev Workshop', 'class', rows[5].id, now.toISOString(), twoHoursLater.toISOString()], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });

        console.log('Sample events seeded.');
        console.log('JSON Seeding complete!');

    } catch (error) {
        console.error('Seeding failed:', error);
    }
};

seed();
