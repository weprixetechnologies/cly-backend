const reviewModel = require('../models/reviewModel');
const { uploadMultipleImages, validateImage } = require('../utils/bunnyUpload');

// Read config flag for auto-approval (defaults to false if not set or not 'true')
const REVIEWS_AUTO_APPROVE = process.env.REVIEWS_AUTO_APPROVE === 'true';

/**
 * Public: Get approved reviews for a product
 */
async function getProductReviews(req, res) {
    try {
        const { productID } = req.params;
        const { page, limit, sort, rating } = req.query;

        if (!productID) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required.'
            });
        }

        const reviews = await reviewModel.getProductReviews(productID, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            sort: sort || 'newest',
            rating: rating ? parseInt(rating) : null
        });

        return res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error) {
        console.error('Error fetching product reviews:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews.',
            error: error.message
        });
    }
}

/**
 * Public: Get product ratings summary
 */
async function getProductSummary(req, res) {
    try {
        const { productID } = req.params;

        if (!productID) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required.'
            });
        }

        const summary = await reviewModel.getProductRatingSummary(productID);

        if (!summary) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }

        return res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching rating summary:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch rating summary.',
            error: error.message
        });
    }
}

/**
 * Customer: Create a review
 */
async function createReview(req, res) {
    try {
        const { productID } = req.params;
        const { rating, title, body, images } = req.body;
        const uid = req.user.uid; // Attached by verifyUserAccessToken middleware

        if (!productID) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required.'
            });
        }

        // Validate rating (1 - 5 stars)
        const ratingVal = parseInt(rating);
        if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be an integer between 1 and 5.'
            });
        }

        // Validate title/body constraints
        if (title && title.length > 150) {
            return res.status(400).json({
                success: false,
                message: 'Title cannot exceed 150 characters.'
            });
        }

        if (images && !Array.isArray(images)) {
            return res.status(400).json({
                success: false,
                message: 'Images must be an array of image URLs.'
            });
        }

        if (images && images.length > 3) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 3 images are allowed.'
            });
        }

        const reviewStatus = REVIEWS_AUTO_APPROVE ? 'approved' : 'pending';

        const result = await reviewModel.createReview({
            productID,
            uid,
            rating: ratingVal,
            title: title || '',
            body: body || '',
            images: images || [],
            status: reviewStatus
        });

        return res.status(201).json({
            success: true,
            message: reviewStatus === 'approved' 
                ? 'Review submitted and approved successfully!' 
                : 'Review submitted successfully! It is now pending moderation.',
            data: result
        });

    } catch (error) {
        console.error('Error creating review:', error.message);
        if (error.code === 'DUPLICATE_REVIEW') {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to create review.',
            error: error.message
        });
    }
}

/**
 * Customer: Update own review
 */
async function updateReview(req, res) {
    try {
        const { reviewId } = req.params;
        const { rating, title, body, images } = req.body;
        const uid = req.user.uid;

        if (!reviewId) {
            return res.status(400).json({
                success: false,
                message: 'Review ID is required.'
            });
        }

        // Validate rating
        const ratingVal = parseInt(rating);
        if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be an integer between 1 and 5.'
            });
        }

        if (title && title.length > 150) {
            return res.status(400).json({
                success: false,
                message: 'Title cannot exceed 150 characters.'
            });
        }

        if (images && (!Array.isArray(images) || images.length > 3)) {
            return res.status(400).json({
                success: false,
                message: 'Images must be an array with max 3 URLs.'
            });
        }

        const result = await reviewModel.updateReview(
            reviewId, 
            uid, 
            { rating: ratingVal, title, body, images },
            REVIEWS_AUTO_APPROVE
        );

        return res.status(200).json({
            success: true,
            message: REVIEWS_AUTO_APPROVE
                ? 'Review updated and approved successfully!'
                : 'Review updated successfully and is now pending moderation.',
            data: result
        });

    } catch (error) {
        console.error('Error updating review:', error.message);
        if (error.code === 'NOT_FOUND') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only edit your own reviews, or the review does not exist.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to update review.',
            error: error.message
        });
    }
}

/**
 * Customer: Delete own review
 */
async function deleteReview(req, res) {
    try {
        const { reviewId } = req.params;
        const uid = req.user.uid;

        if (!reviewId) {
            return res.status(400).json({
                success: false,
                message: 'Review ID is required.'
            });
        }

        await reviewModel.deleteReview(reviewId, uid, false);

        return res.status(200).json({
            success: true,
            message: 'Review deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting review:', error.message);
        if (error.code === 'NOT_FOUND') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only delete your own reviews, or the review does not exist.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to delete review.',
            error: error.message
        });
    }
}

/**
 * Customer: Toggle helpful vote
 */
async function voteHelpful(req, res) {
    try {
        const { reviewId } = req.params;
        const uid = req.user.uid;

        if (!reviewId) {
            return res.status(400).json({
                success: false,
                message: 'Review ID is required.'
            });
        }

        const result = await reviewModel.voteHelpful(reviewId, uid);

        return res.status(200).json({
            success: true,
            message: result.voted ? 'Review marked as helpful.' : 'Helpful mark removed.',
            data: {
                helpfulCount: result.helpfulCount,
                voted: result.voted
            }
        });
    } catch (error) {
        console.error('Error voting helpful:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to vote review.',
            error: error.message
        });
    }
}

/**
 * Customer: Report a review
 */
async function reportReview(req, res) {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;
        const uid = req.user.uid;

        if (!reviewId) {
            return res.status(400).json({
                success: false,
                message: 'Review ID is required.'
            });
        }

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Reason for reporting is required.'
            });
        }

        const result = await reviewModel.reportReview(reviewId, uid, reason);

        return res.status(201).json({
            success: true,
            message: 'Review reported successfully. Our administration will review it.',
            data: result
        });
    } catch (error) {
        console.error('Error reporting review:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to report review.',
            error: error.message
        });
    }
}

/**
 * Customer: Get logged-in user's own reviews
 */
async function getMyReviews(req, res) {
    try {
        const uid = req.user.uid;
        const reviews = await reviewModel.getUserReviews(uid);
        return res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error) {
        console.error('Error getting my reviews:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve reviews.',
            error: error.message
        });
    }
}

/**
 * Customer: Multiple images upload (up to 3 files)
 */
async function uploadReviewImages(req, res) {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded. Field must be named "images" or "image".'
            });
        }

        // Validate each file
        for (const file of req.files) {
            const validation = validateImage(file);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }
        }

        // Upload to Bunny
        const uploadResult = await uploadMultipleImages(req.files, 'reviews');
        if (!uploadResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to upload images to storage server.',
                error: uploadResult.error
            });
        }

        const urls = uploadResult.results.map(r => r.url);

        return res.status(200).json({
            success: true,
            message: 'Images uploaded successfully.',
            data: urls
        });
    } catch (error) {
        console.error('Error uploading review images:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during upload.',
            error: error.message
        });
    }
}

/**
 * Admin: List reviews with filters
 */
async function getAdminReviews(req, res) {
    try {
        const { status, productID, rating, dateFrom, dateTo, page, limit } = req.query;

        const result = await reviewModel.getAdminReviews({
            status,
            productID,
            rating,
            dateFrom,
            dateTo,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10
        });

        return res.status(200).json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Admin fetch reviews error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews.',
            error: error.message
        });
    }
}

/**
 * Admin: Get specific review detail
 */
async function getAdminReviewDetails(req, res) {
    try {
        const { reviewId } = req.params;

        const review = await reviewModel.getReviewDetails(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found.'
            });
        }

        return res.status(200).json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('Admin fetch review detail error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch review details.',
            error: error.message
        });
    }
}

/**
 * Admin: Update review status
 */
async function updateReviewStatus(req, res) {
    try {
        const { reviewId } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value. Approved, rejected, or pending required.'
            });
        }

        await reviewModel.updateReviewStatus(reviewId, status);

        return res.status(200).json({
            success: true,
            message: `Review status updated to '${status}' successfully.`
        });
    } catch (error) {
        console.error('Admin update status error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update review status.',
            error: error.message
        });
    }
}

/**
 * Admin: Reply to a review
 */
async function replyToReview(req, res) {
    try {
        const { reviewId } = req.params;
        const { reply } = req.body;

        if (!reply || reply.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Reply message cannot be empty.'
            });
        }

        await reviewModel.replyToReview(reviewId, reply);

        return res.status(200).json({
            success: true,
            message: 'Store reply added successfully.'
        });
    } catch (error) {
        console.error('Admin reply error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to save store reply.',
            error: error.message
        });
    }
}

/**
 * Admin: Hard delete a review
 */
async function deleteAdminReview(req, res) {
    try {
        const { reviewId } = req.params;

        await reviewModel.deleteReview(reviewId, null, true);

        return res.status(200).json({
            success: true,
            message: 'Review permanently deleted.'
        });
    } catch (error) {
        console.error('Admin delete error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete review.',
            error: error.message
        });
    }
}

/**
 * Admin: List reports
 */
async function getAdminReports(req, res) {
    try {
        const { status } = req.query; // 'open', 'dismissed', 'actioned'
        const reports = await reviewModel.getAdminReports({ status });

        return res.status(200).json({
            success: true,
            data: reports
        });
    } catch (error) {
        console.error('Admin fetch reports error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reports.',
            error: error.message
        });
    }
}

/**
 * Admin: Update report status
 */
async function updateReportStatus(req, res) {
    try {
        const { reportId } = req.params;
        const { status } = req.body;

        if (!['open', 'dismissed', 'actioned'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid report status value.'
            });
        }

        await reviewModel.updateReportStatus(reportId, status);

        return res.status(200).json({
            success: true,
            message: `Report status updated to '${status}' successfully.`
        });
    } catch (error) {
        console.error('Admin update report error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update report.',
            error: error.message
        });
    }
}

/**
 * Admin: Get analytics
 */
async function getReviewsAnalytics(req, res) {
    try {
        const analytics = await reviewModel.getReviewsAnalytics();
        return res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Admin analytics error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to load reviews analytics.',
            error: error.message
        });
    }
}

module.exports = {
    getProductReviews,
    getProductSummary,
    createReview,
    updateReview,
    deleteReview,
    voteHelpful,
    reportReview,
    getMyReviews,
    uploadReviewImages,
    getAdminReviews,
    getAdminReviewDetails,
    updateReviewStatus,
    replyToReview,
    deleteAdminReview,
    getAdminReports,
    updateReportStatus,
    getReviewsAnalytics
};
