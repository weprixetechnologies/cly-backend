const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public routes (no authentication required)
router.post('/request', passwordResetController.requestPasswordReset);
router.get('/verify/:token', passwordResetController.verifyResetToken);
router.post('/reset', passwordResetController.resetPassword);

// Admin routes (authentication required)
router.post('/cleanup', verifyAdminAccessToken, passwordResetController.cleanupExpiredTokens);

module.exports = router;
