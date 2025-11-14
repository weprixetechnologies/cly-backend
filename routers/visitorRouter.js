const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');

// Create a new visitor record
router.post('/', visitorController.createVisitor);

// Get all visitors with pagination
router.get('/', visitorController.getAllVisitors);

// Get visitor statistics
router.get('/stats', visitorController.getVisitorStats);

module.exports = router;

