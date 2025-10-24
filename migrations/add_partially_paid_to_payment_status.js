const db = require('../utils/dbconnect');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Adding partially_paid to payment_status enum...');

        // Modify payment_status enum to include 'partially_paid'
        await connection.execute(
            `ALTER TABLE orders MODIFY COLUMN payment_status ENUM('paid', 'not_paid', 'partially_paid') DEFAULT 'not_paid'`
        );
        console.log('Added partially_paid to payment_status enum.');

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
