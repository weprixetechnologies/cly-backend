const db = require('../utils/dbconnect');
const { v4: uuidv4 } = require('uuid');

/**
 * Recalculate average rating and review count for a product
 */
async function recalculateProductRating(productID, connection = null) {
    const dbConn = connection || db;
    
    // Calculate average rating and review count from approved reviews
    const query = `
        UPDATE products p
        SET p.avgRating = COALESCE((
            SELECT ROUND(AVG(rating), 1) 
            FROM reviews 
            WHERE productID = p.productID AND status = 'approved'
        ), 0.0),
        p.reviewCount = (
            SELECT COUNT(*) 
            FROM reviews 
            WHERE productID = p.productID AND status = 'approved'
        )
        WHERE p.productID = ?
    `;
    
    await dbConn.execute(query, [productID]);
}

/**
 * Create a new review
 */
async function createReview(reviewData) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { productID, uid, rating, title, body, images, status = 'pending' } = reviewData;
        const reviewID = uuidv4();

        // 1. Insert review
        const insertReviewQuery = `
            INSERT INTO reviews (id, productID, uid, rating, title, body, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(insertReviewQuery, [
            reviewID,
            productID,
            uid,
            rating,
            title || null,
            body || null,
            status
        ]);

        // 2. Insert images if any
        if (images && images.length > 0) {
            const insertImageQuery = `
                INSERT INTO review_images (id, reviewID, imageUrl)
                VALUES (?, ?, ?)
            `;
            for (const imgUrl of images) {
                await connection.execute(insertImageQuery, [uuidv4(), reviewID, imgUrl]);
            }
        }

        // 3. Recalculate rating if status is approved (auto-approved case)
        if (status === 'approved') {
            await recalculateProductRating(productID, connection);
        }

        await connection.commit();
        return { success: true, reviewID, status };
    } catch (error) {
        await connection.rollback();
        // Check for duplicate entry error (UNIQUE constraint on uid, productID)
        if (error.code === 'ER_DUP_ENTRY') {
            const dupError = new Error('You have already submitted a review for this product.');
            dupError.code = 'DUPLICATE_REVIEW';
            throw dupError;
        }
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Update a review (re-enters pending unless auto-approved)
 */
async function updateReview(reviewID, uid, reviewData, autoApprove = false) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check ownership first
        const [existing] = await connection.execute(
            'SELECT productID, status FROM reviews WHERE id = ? AND uid = ?',
            [reviewID, uid]
        );

        if (existing.length === 0) {
            const notFoundErr = new Error('Review not found or unauthorized.');
            notFoundErr.code = 'NOT_FOUND';
            throw notFoundErr;
        }

        const productID = existing[0].productID;
        const oldStatus = existing[0].status;
        const newStatus = autoApprove ? 'approved' : 'pending';

        const { rating, title, body, images } = reviewData;

        // 1. Update review details
        const updateQuery = `
            UPDATE reviews 
            SET rating = ?, title = ?, body = ?, status = ?
            WHERE id = ? AND uid = ?
        `;
        await connection.execute(updateQuery, [
            rating,
            title || null,
            body || null,
            newStatus,
            reviewID,
            uid
        ]);

        // 2. Manage images (delete old, insert new)
        if (images !== undefined) {
            // Delete existing images
            await connection.execute('DELETE FROM review_images WHERE reviewID = ?', [reviewID]);
            
            // Insert new images
            if (images && images.length > 0) {
                const insertImageQuery = `
                    INSERT INTO review_images (id, reviewID, imageUrl)
                    VALUES (?, ?, ?)
                `;
                for (const imgUrl of images) {
                    await connection.execute(insertImageQuery, [uuidv4(), reviewID, imgUrl]);
                }
            }
        }

        // 3. Recalculate rating if status changed or if it is currently approved
        if (oldStatus === 'approved' || newStatus === 'approved') {
            await recalculateProductRating(productID, connection);
        }

        await connection.commit();
        return { success: true, status: newStatus };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Delete a review (works for owners and admins)
 */
async function deleteReview(reviewID, uid = null, isAdmin = false) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Retrieve review metadata first
        let selectQuery = 'SELECT productID, status, uid FROM reviews WHERE id = ?';
        let selectParams = [reviewID];
        if (uid && !isAdmin) {
            selectQuery += ' AND uid = ?';
            selectParams.push(uid);
        }

        const [existing] = await connection.execute(selectQuery, selectParams);

        if (existing.length === 0) {
            const notFoundErr = new Error('Review not found or unauthorized.');
            notFoundErr.code = 'NOT_FOUND';
            throw notFoundErr;
        }

        const { productID, status } = existing[0];

        // Delete review (cascade deletes images, votes, reports)
        await connection.execute('DELETE FROM reviews WHERE id = ?', [reviewID]);

        // Recalculate product rating if the deleted review was approved
        if (status === 'approved') {
            await recalculateProductRating(productID, connection);
        }

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Get approved reviews for a product with pagination, filtering and sorting
 */
async function getProductReviews(productID, filters = {}) {
    const {
        page = 1,
        limit = 10,
        sort = 'newest',
        rating = null
    } = filters;

    const offset = (page - 1) * limit;
    
    let query = `
        SELECT r.*, u.name as reviewerName, u.photo as reviewerPhoto, u.username as reviewerUsername
        FROM reviews r
        JOIN users u ON r.uid = u.uid
        WHERE r.productID = ? AND r.status = 'approved'
    `;
    const params = [productID];

    // Filter by star value
    if (rating && !isNaN(rating)) {
        query += ' AND r.rating = ?';
        params.push(parseInt(rating));
    }

    // Sort order
    if (sort === 'helpful') {
        query += ' ORDER BY r.helpfulCount DESC, r.createdAt DESC';
    } else if (sort === 'rating_high') {
        query += ' ORDER BY r.rating DESC, r.createdAt DESC';
    } else if (sort === 'rating_low') {
        query += ' ORDER BY r.rating ASC, r.createdAt DESC';
    } else { // default to 'newest'
        query += ' ORDER BY r.createdAt DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [reviews] = await db.execute(query, params);

    if (reviews.length > 0) {
        const reviewIDs = reviews.map(r => r.id);
        
        // Fetch images for all these reviews
        const [images] = await db.query(
            'SELECT * FROM review_images WHERE reviewID IN (?)',
            [reviewIDs]
        );

        // Group images by reviewID
        const imagesByReview = {};
        images.forEach(img => {
            if (!imagesByReview[img.reviewID]) {
                imagesByReview[img.reviewID] = [];
            }
            imagesByReview[img.reviewID].push(img.imageUrl);
        });

        // Attach images to reviews
        reviews.forEach(r => {
            r.images = imagesByReview[r.id] || [];
        });
    }

    return reviews;
}

/**
 * Returns { avgRating, reviewCount, distribution: {5: n, 4: n, ...} }
 */
async function getProductRatingSummary(productID) {
    // 1. Fetch avgRating and reviewCount from products table directly
    const [product] = await db.execute(
        'SELECT avgRating, reviewCount FROM products WHERE productID = ?',
        [productID]
    );

    if (product.length === 0) {
        return null;
    }

    // 2. Fetch star distribution counts
    const [distributionRows] = await db.execute(
        `SELECT rating, COUNT(*) as count 
         FROM reviews 
         WHERE productID = ? AND status = 'approved' 
         GROUP BY rating`,
        [productID]
    );

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distributionRows.forEach(row => {
        distribution[row.rating] = row.count;
    });

    return {
        avgRating: Number(product[0].avgRating || 0.0),
        reviewCount: parseInt(product[0].reviewCount || 0),
        distribution
    };
}

/**
 * Toggle helpful vote (one vote per user, idempotent toggle)
 */
async function voteHelpful(reviewID, uid) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if vote already exists
        const [existing] = await connection.execute(
            'SELECT id FROM review_votes WHERE reviewID = ? AND uid = ?',
            [reviewID, uid]
        );

        let voteAdded = false;

        if (existing.length > 0) {
            // Remove vote
            await connection.execute(
                'DELETE FROM review_votes WHERE reviewID = ? AND uid = ?',
                [reviewID, uid]
            );
            
            // Decrement count
            await connection.execute(
                'UPDATE reviews SET helpfulCount = GREATEST(helpfulCount - 1, 0) WHERE id = ?',
                [reviewID]
            );
        } else {
            // Add vote
            await connection.execute(
                'INSERT INTO review_votes (id, reviewID, uid) VALUES (?, ?, ?)',
                [uuidv4(), reviewID, uid]
            );
            
            // Increment count
            await connection.execute(
                'UPDATE reviews SET helpfulCount = helpfulCount + 1 WHERE id = ?',
                [reviewID]
            );
            voteAdded = true;
        }

        // Get updated helpful count
        const [updatedReview] = await connection.execute(
            'SELECT helpfulCount FROM reviews WHERE id = ?',
            [reviewID]
        );

        await connection.commit();
        return { 
            success: true, 
            voted: voteAdded, 
            helpfulCount: updatedReview.length > 0 ? updatedReview[0].helpfulCount : 0 
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Report a review
 */
async function reportReview(reviewID, reportedBy, reason) {
    const id = uuidv4();
    const query = `
        INSERT INTO review_reports (id, reviewID, reportedBy, reason, status)
        VALUES (?, ?, ?, ?, 'open')
    `;
    await db.execute(query, [id, reviewID, reportedBy, reason]);
    return { success: true, reportID: id };
}

/**
 * Get logged in user's own reviews
 */
async function getUserReviews(uid) {
    const query = `
        SELECT r.*, p.productName, p.featuredImages as productFeaturedImage
        FROM reviews r
        JOIN products p ON r.productID = p.productID
        WHERE r.uid = ?
        ORDER BY r.createdAt DESC
    `;
    const [reviews] = await db.execute(query, [uid]);

    if (reviews.length > 0) {
        const reviewIDs = reviews.map(r => r.id);
        const [images] = await db.query(
            'SELECT * FROM review_images WHERE reviewID IN (?)',
            [reviewIDs]
        );

        const imagesByReview = {};
        images.forEach(img => {
            if (!imagesByReview[img.reviewID]) {
                imagesByReview[img.reviewID] = [];
            }
            imagesByReview[img.reviewID].push(img.imageUrl);
        });

        reviews.forEach(r => {
            r.images = imagesByReview[r.id] || [];
        });
    }

    return reviews;
}

/**
 * ADMIN: List all reviews with filters
 */
async function getAdminReviews(filters = {}) {
    const {
        status = null,
        productID = null,
        rating = null,
        dateFrom = null,
        dateTo = null,
        page = 1,
        limit = 10
    } = filters;

    const offset = (page - 1) * limit;
    const params = [];
    
    let query = `
        SELECT r.*, u.name as reviewerName, u.emailID as reviewerEmail, p.productName, p.featuredImages as productFeaturedImage
        FROM reviews r
        JOIN users u ON r.uid = u.uid
        JOIN products p ON r.productID = p.productID
        WHERE 1=1
    `;

    if (status) {
        query += ' AND r.status = ?';
        params.push(status);
    }
    if (productID) {
        query += ' AND r.productID = ?';
        params.push(productID);
    }
    if (rating) {
        query += ' AND r.rating = ?';
        params.push(parseInt(rating));
    }
    if (dateFrom) {
        query += ' AND r.createdAt >= ?';
        params.push(dateFrom);
    }
    if (dateTo) {
        query += ' AND r.createdAt <= ?';
        params.push(dateTo);
    }

    query += ' ORDER BY r.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [reviews] = await db.execute(query, params);

    // Fetch images
    if (reviews.length > 0) {
        const reviewIDs = reviews.map(r => r.id);
        const [images] = await db.query(
            'SELECT * FROM review_images WHERE reviewID IN (?)',
            [reviewIDs]
        );

        const imagesByReview = {};
        images.forEach(img => {
            if (!imagesByReview[img.reviewID]) {
                imagesByReview[img.reviewID] = [];
            }
            imagesByReview[img.reviewID].push(img.imageUrl);
        });

        reviews.forEach(r => {
            r.images = imagesByReview[r.id] || [];
        });
    }

    // Get count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE 1=1';
    const countParams = [];
    if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
    }
    if (productID) {
        countQuery += ' AND productID = ?';
        countParams.push(productID);
    }
    if (rating) {
        countQuery += ' AND rating = ?';
        countParams.push(parseInt(rating));
    }
    if (dateFrom) {
        countQuery += ' AND createdAt >= ?';
        countParams.push(dateFrom);
    }
    if (dateTo) {
        countQuery += ' AND createdAt <= ?';
        countParams.push(dateTo);
    }

    const [countRow] = await db.execute(countQuery, countParams);
    const total = countRow[0].total;

    return {
        reviews,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * ADMIN: Get single review detail
 */
async function getReviewDetails(reviewID) {
    const query = `
        SELECT r.*, u.name as reviewerName, u.emailID as reviewerEmail, u.phoneNumber as reviewerPhone, p.productName, p.featuredImages as productFeaturedImage
        FROM reviews r
        JOIN users u ON r.uid = u.uid
        JOIN products p ON r.productID = p.productID
        WHERE r.id = ?
    `;
    const [rows] = await db.execute(query, [reviewID]);
    if (rows.length === 0) return null;

    const review = rows[0];

    // Get images
    const [images] = await db.execute(
        'SELECT imageUrl FROM review_images WHERE reviewID = ?',
        [reviewID]
    );
    review.images = images.map(img => img.imageUrl);

    // Get reports associated with this review
    const [reports] = await db.execute(
        `SELECT rep.*, u.name as reporterName, u.emailID as reporterEmail
         FROM review_reports rep
         JOIN users u ON rep.reportedBy = u.uid
         WHERE rep.reviewID = ?`,
        [reviewID]
    );
    review.reports = reports;

    return review;
}

/**
 * ADMIN: Update review status
 */
async function updateReviewStatus(reviewID, status) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Fetch productID
        const [existing] = await connection.execute(
            'SELECT productID FROM reviews WHERE id = ?',
            [reviewID]
        );

        if (existing.length === 0) {
            throw new Error('Review not found.');
        }

        const { productID } = existing[0];

        // Update status
        await connection.execute(
            'UPDATE reviews SET status = ? WHERE id = ?',
            [status, reviewID]
        );

        // Recalculate
        await recalculateProductRating(productID, connection);

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * ADMIN: Reply to a review
 */
async function replyToReview(reviewID, replyText) {
    const query = `
        UPDATE reviews 
        SET storeReply = ?, storeReplyAt = NOW() 
        WHERE id = ?
    `;
    await db.execute(query, [replyText, reviewID]);
    return { success: true };
}

/**
 * ADMIN: List open/all reports
 */
async function getAdminReports(filters = {}) {
    const { status = 'open' } = filters;
    
    let query = `
        SELECT rep.*, u.name as reporterName, u.emailID as reporterEmail,
               r.rating as reviewRating, r.title as reviewTitle, r.body as reviewBody, r.status as reviewStatus,
               p.productName, p.productID
        FROM review_reports rep
        JOIN users u ON rep.reportedBy = u.uid
        JOIN reviews r ON rep.reviewID = r.id
        JOIN products p ON r.productID = p.productID
        WHERE 1=1
    `;
    const params = [];

    if (status) {
        query += ' AND rep.status = ?';
        params.push(status);
    }

    query += ' ORDER BY rep.createdAt DESC';

    const [reports] = await db.execute(query, params);
    return reports;
}

/**
 * ADMIN: Update report status (dismissed, actioned)
 */
async function updateReportStatus(reportID, status) {
    const query = 'UPDATE review_reports SET status = ? WHERE id = ?';
    await db.execute(query, [status, reportID]);
    return { success: true };
}

/**
 * ADMIN: Get review analytics
 */
async function getReviewsAnalytics() {
    // 1. Top rated products (avgRating >= 4.0, ordered by count and rating)
    const [topRated] = await db.execute(
        `SELECT productID, productName, avgRating, reviewCount, featuredImages as image
         FROM products 
         WHERE reviewCount > 0
         ORDER BY avgRating DESC, reviewCount DESC 
         LIMIT 10`
    );

    // 2. Most reviewed products
    const [mostReviewed] = await db.execute(
        `SELECT productID, productName, avgRating, reviewCount, featuredImages as image
         FROM products 
         WHERE reviewCount > 0
         ORDER BY reviewCount DESC 
         LIMIT 10`
    );

    // 3. Average rating trend over time (monthly averages)
    const [trend] = await db.execute(
        `SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, ROUND(AVG(rating), 2) as avgRating, COUNT(*) as count
         FROM reviews
         WHERE status = 'approved'
         GROUP BY month
         ORDER BY month ASC`
    );

    // 4. Overall system aggregates
    const [totals] = await db.execute(
        `SELECT 
            COUNT(*) as totalReviews,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedCount,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedCount,
            AVG(rating) as systemAvgRating
         FROM reviews`
    );

    const [totalReports] = await db.execute(
        `SELECT COUNT(*) as openReports FROM review_reports WHERE status = 'open'`
    );

    return {
        topRatedProducts: topRated,
        mostReviewedProducts: mostReviewed,
        ratingTrend: trend,
        totals: {
            totalReviews: totals[0].totalReviews || 0,
            pendingCount: totals[0].pendingCount || 0,
            approvedCount: totals[0].approvedCount || 0,
            rejectedCount: totals[0].rejectedCount || 0,
            systemAvgRating: Number(totals[0].systemAvgRating || 0).toFixed(1),
            openReports: totalReports[0].openReports || 0
        }
    };
}

module.exports = {
    createReview,
    updateReview,
    deleteReview,
    getProductReviews,
    getProductRatingSummary,
    voteHelpful,
    reportReview,
    getUserReviews,
    getAdminReviews,
    getReviewDetails,
    updateReviewStatus,
    replyToReview,
    getAdminReports,
    updateReportStatus,
    getReviewsAnalytics,
    recalculateProductRating
};
