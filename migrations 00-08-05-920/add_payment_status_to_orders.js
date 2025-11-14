const db = require('../utils/dbconnect');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Adding payment status to orders table...');

        // Add payment_status field to orders table
        await connection.execute(
            `ALTER TABLE orders ADD COLUMN payment_status ENUM('paid', 'not_paid') DEFAULT 'not_paid'`
        );
        console.log('Added payment_status field to orders table.');

        // Add payment_date field to track when payment was made
        await connection.execute(
            `ALTER TABLE orders ADD COLUMN payment_date DATETIME NULL`
        );
        console.log('Added payment_date field to orders table.');

        // Add payment_reference field for payment tracking
        await connection.execute(
            `ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(255) NULL`
        );
        console.log('Added payment_reference field to orders table.');

        // Set existing orders based on payment mode
        await connection.execute(
            `UPDATE orders SET payment_status = 'paid' WHERE paymentMode = 'PREPAID' OR paymentMode = 'PHONEPE'`
        );
        console.log('Updated existing orders payment status based on payment mode.');

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
