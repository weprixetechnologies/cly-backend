const db = require('../utils/dbconnect');
const { v4: uuidv4 } = require('uuid');

/**
 * site_reviews model
 *
 * Website / overall-experience reviews. Distinct from product reviews.
 * Guests and logged-in users can submit; only approved reviews are shown
 * publicly (homepage carousel).
 */

/**
 * Ensure the site_reviews table exists (idempotent; run on startup).
 */
async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS site_reviews (
            id VARCHAR(50) PRIMARY KEY,
            uid VARCHAR(50) NULL,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255) NULL,
            rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment TEXT NULL,
            status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status_created (status, createdAt),
            CONSTRAINT fk_site_review_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

/**
 * Create a new site review.
 * @param {Object} data
 * @param {string|null} data.uid   Logged-in user id, or null for guests
 * @param {string} data.name
 * @param {string|null} data.email
 * @param {number} data.rating     1..5
 * @param {string} data.comment
 * @param {string} data.status     'pending' | 'approved'
 * @returns {Object} { id }
 */
async function createReview({ uid, name, email, rating, comment, status = 'pending' }) {
    const id = uuidv4();
    await db.execute(
        `INSERT INTO site_reviews (id, uid, name, email, rating, comment, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, uid || null, name, email || null, rating, comment || null, status]
    );
    return { id };
}

/**
 * Public: get approved reviews for the homepage carousel.
 * @param {Object} opts
 * @param {number} opts.limit
 */
async function getApprovedReviews({ limit = 20 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const [rows] = await db.execute(
        `SELECT id, name, rating, comment, createdAt
         FROM site_reviews
         WHERE status = 'approved'
         ORDER BY createdAt DESC
         LIMIT ${safeLimit}`
    );
    return rows;
}

/**
 * Public: aggregate stats for approved reviews (avg + count).
 */
async function getApprovedSummary() {
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total, COALESCE(ROUND(AVG(rating), 1), 0) AS avgRating
         FROM site_reviews
         WHERE status = 'approved'`
    );
    return rows[0] || { total: 0, avgRating: 0 };
}

/**
 * Admin: list reviews with optional status filter + pagination + search.
 */
async function getAdminReviews({ status, page = 1, limit = 20, search = '' } = {}) {
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const params = [];

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        where.push('status = ?');
        params.push(status);
    }

    if (search) {
        where.push('(name LIKE ? OR comment LIKE ? OR email LIKE ?)');
        const term = `%${search}%`;
        params.push(term, term, term);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await db.execute(
        `SELECT COUNT(*) AS total FROM site_reviews ${whereClause}`,
        params
    );
    const totalReviews = countRows[0]?.total || 0;

    const [rows] = await db.execute(
        `SELECT id, uid, name, email, rating, comment, status, createdAt, updatedAt
         FROM site_reviews
         ${whereClause}
         ORDER BY createdAt DESC
         LIMIT ${limitNum} OFFSET ${offset}`,
        params
    );

    return {
        reviews: rows,
        pagination: {
            page: pageNum,
            limit: limitNum,
            totalReviews,
            totalPages: Math.max(1, Math.ceil(totalReviews / limitNum))
        }
    };
}

/**
 * Admin: update a review's moderation status.
 */
async function updateReviewStatus(id, status) {
    const [result] = await db.execute(
        `UPDATE site_reviews SET status = ? WHERE id = ?`,
        [status, id]
    );
    return result.affectedRows > 0;
}

/**
 * Admin: permanently delete a review.
 */
async function deleteReview(id) {
    const [result] = await db.execute(
        `DELETE FROM site_reviews WHERE id = ?`,
        [id]
    );
    return result.affectedRows > 0;
}

module.exports = {
    ensureTable,
    createReview,
    getApprovedReviews,
    getApprovedSummary,
    getAdminReviews,
    updateReviewStatus,
    deleteReview
};
