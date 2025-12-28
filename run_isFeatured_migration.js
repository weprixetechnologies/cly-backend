const db = require('./utils/dbconnect');

async function addIsFeaturedColumn() {
    try {
        console.log('Adding isFeatured column to products table...');

        // Check if column already exists
        const [columns] = await db.execute(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'products' 
             AND COLUMN_NAME = 'isFeatured'`
        );

        if (columns.length > 0) {
            console.log('isFeatured column already exists. Skipping migration.');
            return;
        }

        // Add isFeatured column
        await db.execute(
            `ALTER TABLE products 
             ADD COLUMN isFeatured TINYINT(1) DEFAULT 0 
             AFTER status`
        );

        console.log('Successfully added isFeatured column to products table.');
    } catch (error) {
        console.error('Error adding isFeatured column:', error);
        throw error;
    }
}

// Run migration
addIsFeaturedColumn()
    .then(() => {
        console.log('Migration completed successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });

