const db = require('../utils/dbconnect');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Adding paid amount tracking to orders table...');

        // Add paid_amount field to track how much has been paid for each order item
        await connection.execute(
            `ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0.00`
        );
        console.log('Added paid_amount field to orders table.');

        // Add remaining_amount field to track remaining balance
        await connection.execute(
            `ALTER TABLE orders ADD COLUMN remaining_amount DECIMAL(10,2) DEFAULT 0.00`
        );
        console.log('Added remaining_amount field to orders table.');

        // Initialize remaining_amount based on order_amount for existing orders
        await connection.execute(
            `UPDATE orders SET remaining_amount = order_amount WHERE remaining_amount = 0`
        );
        console.log('Initialized remaining_amount for existing orders.');

        await connection.commit();
        console.log('Migration completed successfully.');
    } catch (error) {
        await connection.rollback();
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

runMigration().catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
});
