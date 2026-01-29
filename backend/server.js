const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { initDB } = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        system_mode: process.env.SYSTEM_MODE,
        timestamp: new Date().toISOString()
    });
});

// Import Routes
const pulseRoutes = require('./routes/pulseRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');

app.use('/api', pulseRoutes);
app.use('/api', resourceRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', telemetryRoutes);

// Initialize Database and Start Server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`PulseCampus + ReSourceX Backend running on port ${PORT}`);
        console.log(`System Mode: ${process.env.SYSTEM_MODE}`);

        // Start Random Data Simulation
        const { runSimulationStep } = require('./controllers/pulseController');
        console.log('Starting Live Occupancy Simulation (10s interval)...');
        setInterval(runSimulationStep, 10000);
        runSimulationStep(); // Initial run
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
