const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public routes (no authentication required)
router.get('/', faqController.getAllFAQs);

// Admin routes (authentication required)
router.use('/admin', verifyAdminAccessToken);
router.get('/admin', faqController.getAllFAQs);
router.get('/admin/:id', faqController.getFAQById);
router.post('/admin', faqController.createFAQ);
router.put('/admin/:id', faqController.updateFAQ);
router.delete('/admin/:id', faqController.deleteFAQ);
router.put('/admin/order', faqController.updateFAQOrder);

module.exports = router;
