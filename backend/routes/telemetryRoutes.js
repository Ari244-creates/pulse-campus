const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');

router.get('/telemetry', telemetryController.getTelemetry);
router.post('/telemetry/update', telemetryController.updateTelemetry);

module.exports = router;
