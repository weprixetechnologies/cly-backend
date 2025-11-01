const db = require('../utils/dbconnect');

async function addThemeCategoryToOrders() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Add themeCategory column to orders table
        await connection.execute(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS themeCategory VARCHAR(255) DEFAULT NULL AFTER customer_comment
        `);

        await connection.commit();
        console.log('✓ Successfully added themeCategory column to orders table');
    } catch (error) {
        await connection.rollback();
        console.error('✗ Error adding themeCategory column to orders:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the migration
if (require.main === module) {
    addThemeCategoryToOrders()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addThemeCategoryToOrders;

