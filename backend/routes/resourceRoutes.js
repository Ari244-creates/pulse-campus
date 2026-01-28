const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

router.get('/events', resourceController.getEvents);
router.post('/events/create', resourceController.createEvent);
router.post('/resource/evaluate', resourceController.evaluateResource);
router.post('/resource/reassign', resourceController.reassignResource);
router.get('/resource/history', resourceController.getDecisionHistory);

module.exports = router;
