const db = require('../utils/dbconnect');

async function runMigration() {
    console.log('🚀 Starting reviews and ratings tables migration...');

    try {
        // 1. Create reviews table
        await db.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id VARCHAR(50) PRIMARY KEY,
                productID VARCHAR(50) NOT NULL,
                uid VARCHAR(50) NOT NULL,
                rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
                title VARCHAR(150) NULL,
                body TEXT NULL,
                status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                helpfulCount INT NOT NULL DEFAULT 0,
                storeReply TEXT NULL,
                storeReplyAt DATETIME NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_user_product (uid, productID),
                FOREIGN KEY (productID) REFERENCES products(productID) ON DELETE CASCADE,
                FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
                INDEX idx_product_status (productID, status)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created reviews table');

        // 2. Create review_images table
        await db.query(`
            CREATE TABLE IF NOT EXISTS review_images (
                id VARCHAR(50) PRIMARY KEY,
                reviewID VARCHAR(50) NOT NULL,
                imageUrl VARCHAR(500) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reviewID) REFERENCES reviews(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created review_images table');

        // 3. Create review_votes table
        await db.query(`
            CREATE TABLE IF NOT EXISTS review_votes (
                id VARCHAR(50) PRIMARY KEY,
                reviewID VARCHAR(50) NOT NULL,
                uid VARCHAR(50) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_vote (reviewID, uid),
                FOREIGN KEY (reviewID) REFERENCES reviews(id) ON DELETE CASCADE,
                FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created review_votes table');

        // 4. Create review_reports table
        await db.query(`
            CREATE TABLE IF NOT EXISTS review_reports (
                id VARCHAR(50) PRIMARY KEY,
                reviewID VARCHAR(50) NOT NULL,
                reportedBy VARCHAR(50) NOT NULL,
                reason VARCHAR(255) NOT NULL,
                status ENUM('open', 'dismissed', 'actioned') NOT NULL DEFAULT 'open',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reviewID) REFERENCES reviews(id) ON DELETE CASCADE,
                FOREIGN KEY (reportedBy) REFERENCES users(uid) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created review_reports table');

        // 5. Add columns to products table if not present
        // Check for avgRating column
        const [avgRatingCol] = await db.execute(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'products' 
             AND COLUMN_NAME = 'avgRating'`
        );

        if (avgRatingCol.length === 0) {
            await db.execute(
                `ALTER TABLE products 
                 ADD COLUMN avgRating DECIMAL(2,1) NOT NULL DEFAULT 0.0 
                 AFTER isFeatured`
            );
            console.log('✅ Added avgRating column to products table');
        } else {
            console.log('ℹ️ avgRating column already exists in products table');
        }

        // Check for reviewCount column
        const [reviewCountCol] = await db.execute(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'products' 
             AND COLUMN_NAME = 'reviewCount'`
        );

        if (reviewCountCol.length === 0) {
            await db.execute(
                `ALTER TABLE products 
                 ADD COLUMN reviewCount INT NOT NULL DEFAULT 0 
                 AFTER avgRating`
            );
            console.log('✅ Added reviewCount column to products table');
        } else {
            console.log('ℹ️ reviewCount column already exists in products table');
        }

        console.log('\n✅ All review migrations completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    }
}

module.exports = runMigration;
