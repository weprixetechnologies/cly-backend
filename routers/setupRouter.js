const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setupController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Apply admin authentication middleware to all setup routes
router.use(verifyAdminAccessToken);

// POST /api/setup/add-order-amount-column
router.post('/add-order-amount-column', setupController.addOrderAmountColumn);

// POST /api/setup/add-product-price-column
router.post('/add-product-price-column', setupController.addProductPriceColumn);

module.exports = router;
