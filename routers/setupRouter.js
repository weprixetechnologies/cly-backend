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

// POST /api/setup/add-partial-acceptance-columns
router.post('/add-partial-acceptance-columns', setupController.addPartialAcceptanceColumns);

// POST /api/setup/add-custom-price-and-shipping
router.post('/add-custom-price-and-shipping', setupController.addCustomPriceAndShippingColumns);

// POST /api/setup/add-increased-status
router.post('/add-increased-status', setupController.addIncreasedStatus);

module.exports = router;
