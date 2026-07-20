const db = require('../utils/dbconnect');

/**
 * Migration: site_reviews table
 *
 * Stores website / overall-experience reviews (distinct from product reviews).
 * Supports both guest and logged-in submissions:
 *   - Logged-in users have `uid` set (name/email auto-filled client side).
 *   - Guests have `uid` NULL and provide name (+ optional email).
 * Reviews are shown in the homepage carousel only after admin approval.
 */
async function runMigration() {
    console.log('🚀 Starting site_reviews table migration...');

    try {
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
        console.log('✅ Created site_reviews table');

        console.log('\n✅ Site reviews migration completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    }
}

module.exports = runMigration;
