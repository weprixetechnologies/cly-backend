const siteReviewModel = require('../models/siteReviewModel');

// Auto-approve website reviews when explicitly enabled (defaults to false)
const SITE_REVIEWS_AUTO_APPROVE = process.env.SITE_REVIEWS_AUTO_APPROVE === 'true';

/**
 * Public: submit a website / experience review.
 * Works for guests (name required, email optional) and logged-in users
 * (uid attached by optional auth; name/email supplied by client).
 */
async function createReview(req, res) {
    try {
        const { rating, comment } = req.body;
        let { name, email } = req.body;

        // uid is attached by verifyUserAccessToken when a valid token is present.
        const uid = req.user?.uid || req.user?.id || null;

        // Validate rating (1 - 5 stars)
        const ratingVal = parseInt(rating);
        if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be an integer between 1 and 5.'
            });
        }

        name = (name || '').trim();
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required.'
            });
        }
        if (name.length > 120) {
            return res.status(400).json({
                success: false,
                message: 'Name cannot exceed 120 characters.'
            });
        }

        email = (email || '').trim();
        if (email && email.length > 255) {
            return res.status(400).json({
                success: false,
                message: 'Email cannot exceed 255 characters.'
            });
        }

        const commentVal = (comment || '').trim();

        const status = SITE_REVIEWS_AUTO_APPROVE ? 'approved' : 'pending';

        const result = await siteReviewModel.createReview({
            uid,
            name,
            email: email || null,
            rating: ratingVal,
            comment: commentVal,
            status
        });

        return res.status(201).json({
            success: true,
            message: status === 'approved'
                ? 'Thank you! Your review has been published.'
                : 'Thank you! Your review has been submitted and is awaiting approval.',
            data: result
        });
    } catch (error) {
        console.error('Error creating site review:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit review.',
            error: error.message
        });
    }
}

/**
 * Public: get approved reviews for the homepage carousel.
 */
async function getApprovedReviews(req, res) {
    try {
        const { limit } = req.query;
        const [reviews, summary] = await Promise.all([
            siteReviewModel.getApprovedReviews({ limit: parseInt(limit) || 20 }),
            siteReviewModel.getApprovedSummary()
        ]);

        return res.status(200).json({
            success: true,
            data: reviews,
            summary
        });
    } catch (error) {
        console.error('Error fetching approved site reviews:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews.',
            error: error.message
        });
    }
}

/**
 * Admin: list all reviews with filtering + pagination.
 */
async function getAdminReviews(req, res) {
    try {
        const { status, page, limit, search } = req.query;
        const result = await siteReviewModel.getAdminReviews({
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            search: search || ''
        });

        return res.status(200).json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching admin site reviews:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews.',
            error: error.message
        });
    }
}

/**
 * Admin: approve or reject a review.
 */
async function updateReviewStatus(req, res) {
    try {
        const { reviewId } = req.params;
        const { status } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be one of 'pending', 'approved', or 'rejected'."
            });
        }

        const updated = await siteReviewModel.updateReviewStatus(reviewId, status);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Review not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Review ${status} successfully.`
        });
    } catch (error) {
        console.error('Error updating site review status:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update review status.',
            error: error.message
        });
    }
}

/**
 * Admin: permanently delete a review.
 */
async function deleteReview(req, res) {
    try {
        const { reviewId } = req.params;
        const deleted = await siteReviewModel.deleteReview(reviewId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Review not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Review deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting site review:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete review.',
            error: error.message
        });
    }
}

module.exports = {
    createReview,
    getApprovedReviews,
    getAdminReviews,
    updateReviewStatus,
    deleteReview
};
