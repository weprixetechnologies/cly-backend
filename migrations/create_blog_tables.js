const db = require('../utils/dbconnect');

async function runMigration() {
    console.log('🚀 Starting blog system tables migration...');

    try {
        // 1. Create blog_categories table
        await db.query(`
            CREATE TABLE IF NOT EXISTS blog_categories (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(120) NOT NULL UNIQUE,
                description TEXT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created blog_categories table');

        // 2. Create blog_posts table
        await db.query(`
            CREATE TABLE IF NOT EXISTS blog_posts (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                slug VARCHAR(220) NOT NULL UNIQUE,
                excerpt VARCHAR(300) NULL,
                content LONGTEXT NOT NULL,
                content_format ENUM('markdown', 'html') NOT NULL DEFAULT 'html',
                cover_image_url VARCHAR(500) NULL,
                cover_image_alt VARCHAR(200) NULL,
                author_id VARCHAR(50) NOT NULL,
                category_id VARCHAR(50) NULL,
                status ENUM('draft', 'published', 'scheduled', 'archived') NOT NULL DEFAULT 'draft',
                published_at DATETIME NULL,
                scheduled_for DATETIME NULL,
                meta_title VARCHAR(70) NULL,
                meta_description VARCHAR(160) NULL,
                canonical_url VARCHAR(500) NULL,
                og_image_url VARCHAR(500) NULL,
                reading_time_min SMALLINT NULL,
                view_count INT NOT NULL DEFAULT 0,
                is_featured BOOLEAN NOT NULL DEFAULT FALSE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(uid) ON DELETE RESTRICT,
                FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL,
                INDEX idx_status_published (status, published_at)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created blog_posts table');

        // Check if fulltext search index already exists, if not create it
        try {
            const [indexes] = await db.query(`
                SHOW INDEX FROM blog_posts WHERE KEY_NAME = 'idx_search'
            `);
            if (indexes.length === 0) {
                await db.query(`
                    ALTER TABLE blog_posts ADD FULLTEXT INDEX idx_search (title, excerpt, content)
                `);
                console.log('✅ Created FULLTEXT index on blog_posts');
            } else {
                console.log('ℹ️ FULLTEXT index already exists on blog_posts');
            }
        } catch (ftError) {
            console.error('⚠️ Failed to check or create FULLTEXT index (might not be supported on this storage engine):', ftError.message);
        }

        // 3. Create blog_tags table
        await db.query(`
            CREATE TABLE IF NOT EXISTS blog_tags (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                slug VARCHAR(60) NOT NULL UNIQUE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created blog_tags table');

        // 4. Create blog_post_tags table (many-to-many posts and tags)
        await db.query(`
            CREATE TABLE IF NOT EXISTS blog_post_tags (
                post_id VARCHAR(50) NOT NULL,
                tag_id VARCHAR(50) NOT NULL,
                PRIMARY KEY (post_id, tag_id),
                FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created blog_post_tags table');

        // 5. Create blog_post_product_links table (linking posts to products)
        await db.query(`
            CREATE TABLE IF NOT EXISTS blog_post_product_links (
                post_id VARCHAR(50) NOT NULL,
                product_id VARCHAR(50) NOT NULL,
                PRIMARY KEY (post_id, product_id),
                FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(productID) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created blog_post_product_links table');

        // 6. Create blog_post_slug_history table
        await db.query(`
            CREATE TABLE IF NOT EXISTS blog_post_slug_history (
                id VARCHAR(50) PRIMARY KEY,
                post_id VARCHAR(50) NOT NULL,
                old_slug VARCHAR(220) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
                INDEX idx_old_slug (old_slug)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created blog_post_slug_history table');

        console.log('\n✅ All blog migrations completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    }
}

module.exports = runMigration;
