const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Generate invoice HTML (for admin)
router.get('/generate/:orderID', verifyAdminAccessToken, invoiceController.generateInvoice);

// Download invoice as PDF (for admin)
router.get('/download/:orderID', verifyAdminAccessToken, invoiceController.downloadInvoice);

// Download shipping label as PDF (for admin)
router.post('/shipping-label/:orderID', verifyAdminAccessToken, invoiceController.downloadShippingLabel);

module.exports = router;
