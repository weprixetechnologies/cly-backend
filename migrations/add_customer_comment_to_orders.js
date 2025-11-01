const db = require('../utils/dbconnect');

async function addCustomerCommentColumn() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Add customer_comment column to orders table
        await connection.execute(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS customer_comment TEXT DEFAULT NULL AFTER remarks
        `);

        await connection.commit();
        console.log('✓ Successfully added customer_comment column to orders table');
    } catch (error) {
        await connection.rollback();
        console.error('✗ Error adding customer_comment column:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the migration
if (require.main === module) {
    addCustomerCommentColumn()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addCustomerCommentColumn;

