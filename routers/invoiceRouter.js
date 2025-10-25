const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Generate invoice HTML (for admin)
router.get('/generate/:orderID', verifyAdminAccessToken, invoiceController.generateInvoice);

// Download invoice as HTML (for admin)
router.get('/download/:orderID', verifyAdminAccessToken, invoiceController.downloadInvoice);

module.exports = router;
