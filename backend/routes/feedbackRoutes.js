const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

router.post('/feedback/evaluate', feedbackController.evaluateFeedback);
router.get('/feedback/metrics', feedbackController.getMetrics);

module.exports = router;
