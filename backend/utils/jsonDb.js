const fs = require('fs');
const path = require('path');

class JsonDb {
    constructor(dbDir) {
        this.dbDir = dbDir;
        this.tables = {};
        this.paths = {
            spaces: path.join(dbDir, 'spaces.json'),
            occupancy_logs: path.join(dbDir, 'occupancy_logs.json'),
            predictions: path.join(dbDir, 'predictions.json'),
            events: path.join(dbDir, 'events.json'),
            reassignment_logs: path.join(dbDir, 'reassignment_logs.json'),
            accuracy_metrics: path.join(dbDir, 'accuracy_metrics.json'),
            telemetry: path.join(dbDir, 'telemetry.json')
        };
        this.init();
    }

    init() {
        if (!fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
        }

        Object.keys(this.paths).forEach(table => {
            if (!fs.existsSync(this.paths[table])) {
                fs.writeFileSync(this.paths[table], JSON.stringify([], null, 2));
            }
            this.tables[table] = JSON.parse(fs.readFileSync(this.paths[table], 'utf8'));
        });
    }

    save(table) {
        fs.writeFileSync(this.paths[table], JSON.stringify(this.tables[table], null, 2));
    }

    // Mock sqlite3 .all()
    all(query, params, callback) {
        const match = query.match(/FROM\s+(\w+)/i);
        if (!match) return callback(new Error("Invalid query"), []);
        const tableName = match[1];
        const data = this.tables[tableName] || [];
        callback(null, data);
    }

    // Mock sqlite3 .get()
    get(query, params, callback) {
        const match = query.match(/FROM\s+(\w+)/i);
        const tableName = match ? match[1] : null;
        if (!tableName) return callback(new Error("Invalid table"), null);

        const data = this.tables[tableName] || [];
        const result = data.find(item => {
            if (query.includes('WHERE id = ?')) return item.id === params[0];
            if (query.includes('WHERE key = ?')) return item.key === params[0];
            return true;
        });
        callback(null, result);
    }

    // Mock sqlite3 .run()
    run(query, params, callback) {
        const insertMatch = query.match(/INSERT\s+INTO\s+(\w+)/i);
        if (!insertMatch) return callback(new Error("Only INSERT/UPSERT supported"), null);

        const tableName = insertMatch[1];
        const table = this.tables[tableName];

        const fieldsMatch = query.match(/\((.*?)\)/);
        if (!fieldsMatch) return callback(new Error("Invalid query"), null);
        const fields = fieldsMatch[1].split(',').map(f => f.trim());

        // Special mapping for Telemetry Upsert
        if (tableName === 'telemetry') {
            const keyIndex = fields.indexOf('key');
            if (keyIndex !== -1) {
                const keyVal = params[keyIndex];
                const existingIndex = table.findIndex(item => item.key === keyVal);
                if (existingIndex !== -1) {
                    fields.forEach((field, idx) => {
                        table[existingIndex][field] = params[idx];
                    });
                    table[existingIndex].timestamp = new Date().toISOString();
                    this.save(tableName);
                    return callback.call({ lastID: table[existingIndex].id }, null);
                }
            }
        }

        const newId = table.length > 0 ? Math.max(...table.map(i => i.id)) + 1 : 1;
        const newItem = { id: newId };

        fields.forEach((field, index) => {
            newItem[field] = params[index];
        });

        if (!newItem.timestamp) newItem.timestamp = new Date().toISOString();

        table.push(newItem);
        this.save(tableName);

        const self = { lastID: newId };
        callback.call(self, null);
    }

    // Helper to reset (optional for seeding)
    exec(query, callback) {
        if (query === 'DELETE' || query === 'DROP') {
            Object.keys(this.tables).forEach(t => {
                this.tables[t] = [];
                this.save(t);
            });
        }
        callback(null);
    }
}

module.exports = JsonDb;
