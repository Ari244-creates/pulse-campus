-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- library, classroom, hall, etc.
    capacity INTEGER NOT NULL
);

-- Occupancy Logs
CREATE TABLE IF NOT EXISTS occupancy_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    space_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_count INTEGER,
    FOREIGN KEY(space_id) REFERENCES spaces(id)
);

-- Predictions
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    space_id INTEGER,
    predicted_count INTEGER,
    prediction_time DATETIME,
    confidence REAL,
    FOREIGN KEY(space_id) REFERENCES spaces(id)
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    priority TEXT NOT NULL, -- exam, class, club
    space_id INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    FOREIGN KEY(space_id) REFERENCES spaces(id)
);

-- Reassignment Logs
CREATE TABLE IF NOT EXISTS reassignment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    from_space_id INTEGER,
    to_space_id INTEGER,
    reason TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES events(id),
    FOREIGN KEY(from_space_id) REFERENCES spaces(id),
    FOREIGN KEY(to_space_id) REFERENCES spaces(id)
);

-- Accuracy Metrics
CREATE TABLE IF NOT EXISTS accuracy_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    space_id INTEGER,
    prediction_id INTEGER,
    actual_count INTEGER,
    error_margin REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(space_id) REFERENCES spaces(id),
    FOREIGN KEY(prediction_id) REFERENCES predictions(id)
);
