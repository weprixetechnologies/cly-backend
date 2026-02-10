const db = require('./utils/dbconnect');

async function createHomepageVideosTable() {
    try {
        console.log('Checking for homepageVideos table...');

        const [tables] = await db.execute(
            `SELECT TABLE_NAME 
             FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'homepageVideos'`
        );

        if (tables.length > 0) {
            console.log('homepageVideos table already exists. Skipping migration.');
            return;
        }

        console.log('Creating homepageVideos table...');

        await db.execute(`
            CREATE TABLE homepageVideos (
                videoID     INT AUTO_INCREMENT PRIMARY KEY,
                title       VARCHAR(255),
                videoUrl    TEXT NOT NULL,
                isActive    TINYINT(1) DEFAULT 1,
                sortOrder   INT DEFAULT 0,
                createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        console.log('homepageVideos table created successfully.');
    } catch (error) {
        console.error('Error creating homepageVideos table:', error);
        throw error;
    }
}

createHomepageVideosTable()
    .then(() => {
        console.log('Homepage videos migration completed successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Homepage videos migration failed:', error);
        process.exit(1);
    });

