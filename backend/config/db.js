const path = require('path');
const JsonDb = require('../utils/jsonDb');

const dbDir = path.resolve(process.cwd(), './db/json');
const db = new JsonDb(dbDir);

const initDB = () => {
    return new Promise((resolve, reject) => {
        db.exec('', (err) => {
            if (err) {
                console.error('Error initializing JSON database:', err);
                reject(err);
            } else {
                console.log('JSON Database initialized at:', dbDir);
                resolve();
            }
        });
    });
};

module.exports = { db, initDB };
