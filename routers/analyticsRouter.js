const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

// All analytics routes require admin authentication
router.use(verifyAdminAccessToken);

// Get comprehensive dashboard analytics
router.get('/dashboard', analyticsController.getDashboardAnalytics);

// Get product-specific analytics
router.get('/products', analyticsController.getProductAnalytics);

// Get user-specific analytics
router.get('/users', analyticsController.getUserAnalytics);

module.exports = router;

