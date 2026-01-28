const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || './db/campus.sqlite');
const schemaPath = path.resolve(process.cwd(), './db/schema.sql');

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

const initDB = () => {
    return new Promise((resolve, reject) => {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error initializing database:', err);
                reject(err);
            } else {
                console.log('Database schema initialized');
                resolve();
            }
        });
    });
};

module.exports = { db, initDB };
