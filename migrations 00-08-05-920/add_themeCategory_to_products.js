const db = require('../utils/dbconnect');

async function addThemeCategoryColumn() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Add themeCategory column to products table
        await connection.execute(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS themeCategory VARCHAR(255) DEFAULT NULL AFTER categoryName
        `);

        // Add index for better performance
        await connection.execute(`
            CREATE INDEX IF NOT EXISTS idx_products_themeCategory ON products(themeCategory)
        `);

        await connection.commit();
        console.log('✓ Successfully added themeCategory column to products table');
    } catch (error) {
        await connection.rollback();
        console.error('✗ Error adding themeCategory column:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the migration
if (require.main === module) {
    addThemeCategoryColumn()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addThemeCategoryColumn;

