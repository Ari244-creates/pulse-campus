const { db, initDB } = require('../config/db');
const { generateOccupancy } = require('../utils/simulation');

const seed = async () => {
    try {
        await initDB();
        console.log('Seeding data...');

        const spaces = [
            { name: 'Grand Library', type: 'library', capacity: 200 },
            { name: 'Room A-101', type: 'classroom', capacity: 40 },
            { name: 'Main Auditorium', type: 'hall', capacity: 500 },
            { name: 'Science Lab 1', type: 'classroom', capacity: 30 },
            { name: 'Student Lounge', type: 'hall', capacity: 100 },
            { name: 'Computing Lab B', type: 'classroom', capacity: 50 }
        ];

        // Clear existing data
        db.serialize(() => {
            db.run('DELETE FROM spaces');
            db.run('DELETE FROM occupancy_logs');
            db.run('DELETE FROM predictions');
            db.run('DELETE FROM events');
            db.run('DELETE FROM reassignment_logs');

            // Insert Spaces
            const spaceStmt = db.prepare('INSERT INTO spaces (name, type, capacity) VALUES (?, ?, ?)');
            spaces.forEach(s => {
                spaceStmt.run(s.name, s.type, s.capacity);
            });
            spaceStmt.finalize();

            console.log('Spaces seeded.');

            // Insert initial occupancy logs for currently active spaces
            db.all('SELECT * FROM spaces', (err, rows) => {
                if (err) return console.error(err);

                const logStmt = db.prepare('INSERT INTO occupancy_logs (space_id, current_count) VALUES (?, ?)');
                rows.forEach(row => {
                    const count = generateOccupancy(row.capacity);
                    logStmt.run(row.id, count);
                });
                logStmt.finalize();
                console.log('Initial occupancy logs seeded.');

                // Insert sample events
                const eventStmt = db.prepare('INSERT INTO events (name, priority, space_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
                const now = new Date();
                const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

                eventStmt.run('Physics Final Exam', 'exam', rows[1].id, now.toISOString(), twoHoursLater.toISOString());
                eventStmt.run('Web Dev Workshop', 'class', rows[5].id, now.toISOString(), twoHoursLater.toISOString());
                eventStmt.finalize();

                console.log('Sample events seeded.');
                console.log('Seeding complete! You can now start the server.');
            });
        });

    } catch (error) {
        console.error('Seeding failed:', error);
    }
};

seed();
