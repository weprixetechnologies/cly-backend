const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const siteReviewController = require('../controllers/siteReviewController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

/**
 * Optional auth: attaches req.user when a valid token is present, but never
 * blocks the request. Website reviews accept both guests and logged-in users.
 */
const optionalUserAuth = (req, res, next) => {
    try {
        const token = req.headers?.authorization?.split(' ')[1];
        if (token) {
            const jwtSecret = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-in-production-2024';
            req.user = jwt.verify(token, jwtSecret);
        }
    } catch (_) {
        // Invalid/expired token — treat as guest, don't block.
    }
    next();
};

// Strictly verify admin/manager role from JWT payload
const verifyAdminRole = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Administrator privileges required. Current role: ${req.user?.role || 'none'}`
        });
    }
    next();
};

/**
 * -------------------------------------------------------------
 * PUBLIC ENDPOINTS
 * -------------------------------------------------------------
 */

// Get approved website reviews (homepage carousel)
router.get('/site-reviews', siteReviewController.getApprovedReviews);

// Submit a website review (guest or logged-in)
router.post('/site-reviews', optionalUserAuth, siteReviewController.createReview);

/**
 * -------------------------------------------------------------
 * ADMIN MANAGEMENT ENDPOINTS
 * -------------------------------------------------------------
 */
router.use('/admin/site-reviews', verifyAdminAccessToken, verifyAdminRole);

// List all website reviews with filtering/pagination
router.get('/admin/site-reviews', siteReviewController.getAdminReviews);

// Approve or reject a review
router.patch('/admin/site-reviews/:reviewId/status', siteReviewController.updateReviewStatus);

// Permanently delete a review
router.delete('/admin/site-reviews/:reviewId', siteReviewController.deleteReview);

module.exports = router;
