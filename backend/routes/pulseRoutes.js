const express = require('express');
const router = express.Router();
const pulseController = require('../controllers/pulseController');

router.get('/spaces', pulseController.getSpaces);
router.post('/occupancy/update', pulseController.updateOccupancy);
router.get('/occupancy/current', pulseController.getCurrentOccupancy);
router.get('/occupancy/heatmap', pulseController.getHeatmapData);
router.get('/predictions/next', pulseController.getPredictions);

module.exports = router;
