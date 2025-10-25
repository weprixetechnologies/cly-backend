const express = require('express');
const router = express.Router();
const aboutController = require('../controllers/aboutController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public routes (no authentication required)
router.get('/', aboutController.getAboutContent);

// Admin routes (authentication required)
router.use('/admin', verifyAdminAccessToken);
router.get('/admin', aboutController.getAboutContent);
router.put('/admin', aboutController.updateAboutContent);

module.exports = router;
