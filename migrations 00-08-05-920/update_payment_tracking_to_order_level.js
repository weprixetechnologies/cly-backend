const db = require('../utils/dbconnect');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Updating payment tracking to order level...');

        // Remove per-item payment columns
        await connection.execute(
            `ALTER TABLE orders DROP COLUMN paid_amount`
        );
        console.log('Removed paid_amount column from orders table.');

        await connection.execute(
            `ALTER TABLE orders DROP COLUMN remaining_amount`
        );
        console.log('Removed remaining_amount column from orders table.');

        // Create a new order_payments table for order-level payment tracking
        await connection.execute(
            `CREATE TABLE IF NOT EXISTS order_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                orderID VARCHAR(255) NOT NULL,
                paid_amount DECIMAL(10,2) DEFAULT 0.00,
                payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                payment_reference VARCHAR(255) NULL,
                admin_uid VARCHAR(255) NOT NULL,
                notes TEXT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_orderID (orderID),
                FOREIGN KEY (orderID) REFERENCES orders(orderID) ON DELETE CASCADE
            )`
        );
        console.log('Created order_payments table for order-level payment tracking.');

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
