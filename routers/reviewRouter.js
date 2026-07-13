const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyUserAccessToken } = require('../middleware/userAuthMiddleware');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');
const { upload } = require('../utils/multerConfig');

// Reusable middleware to strictly verify admin role from JWT payload
const verifyAdminRole = (req, res, next) => {
    console.log('[verifyAdminRole] req.user:', req.user);
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

// Get approved reviews for a product
router.get('/products/:productID/reviews', reviewController.getProductReviews);

// Get rating summary for a product
router.get('/products/:productID/reviews/summary', reviewController.getProductSummary);


/**
 * -------------------------------------------------------------
 * PROTECTED CUSTOMER ENDPOINTS
 * -------------------------------------------------------------
 */

// Submit a new review
router.post('/products/:productID/reviews', verifyUserAccessToken, reviewController.createReview);

// Edit an existing review
router.put('/reviews/:reviewId', verifyUserAccessToken, reviewController.updateReview);

// Delete own review
router.delete('/reviews/:reviewId', verifyUserAccessToken, reviewController.deleteReview);

// Toggle helpful mark
router.post('/reviews/:reviewId/vote', verifyUserAccessToken, reviewController.voteHelpful);

// Report a review as abusive
router.post('/reviews/:reviewId/report', verifyUserAccessToken, reviewController.reportReview);

// List logged-in user's own reviews
router.get('/users/me/reviews', verifyUserAccessToken, reviewController.getMyReviews);

// Image uploading endpoint
router.post('/reviews/upload', verifyUserAccessToken, upload.array('images', 3), reviewController.uploadReviewImages);


/**
 * -------------------------------------------------------------
 * ADMIN MANAGEMENT ENDPOINTS
 * -------------------------------------------------------------
 */

// Apply admin token and role validation to all routes below
router.use('/admin/reviews', verifyAdminAccessToken, verifyAdminRole);

// List all reviews with filtering/pagination
router.get('/admin/reviews', reviewController.getAdminReviews);

// List reported reviews
router.get('/admin/reviews/reports', reviewController.getAdminReports);

// Get analytics summaries
router.get('/admin/reviews/analytics', reviewController.getReviewsAnalytics);

// Fetch details for a specific review (including reports list)
router.get('/admin/reviews/:reviewId', reviewController.getAdminReviewDetails);

// Approve or reject a review
router.patch('/admin/reviews/:reviewId/status', reviewController.updateReviewStatus);

// Reply to a review
router.post('/admin/reviews/:reviewId/reply', reviewController.replyToReview);

// Permanently delete a review
router.delete('/admin/reviews/:reviewId', reviewController.deleteAdminReview);

// Action or dismiss a report
router.patch('/admin/reviews/reports/:reportId', reviewController.updateReportStatus);

module.exports = router;
