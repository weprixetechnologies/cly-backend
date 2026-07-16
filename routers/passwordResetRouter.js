const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// ─── SMS OTP flow (primary) ───────────────────────────────────────────────────
// 1. User submits email → OTP sent to registered mobile
router.post('/request', passwordResetController.requestPasswordReset);

// 2. User submits email + OTP + newPassword → password reset in one step
router.post('/verify-otp', passwordResetController.verifyOTPAndResetPassword);

// ─── Email link flow (legacy / fallback) ─────────────────────────────────────
router.get('/verify/:token', passwordResetController.verifyResetToken);
router.post('/reset', passwordResetController.resetPassword);

// ─── Admin ───────────────────────────────────────────────────────────────────
router.post('/cleanup', verifyAdminAccessToken, passwordResetController.cleanupExpiredTokens);

module.exports = router;
