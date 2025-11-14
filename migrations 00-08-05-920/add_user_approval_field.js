const db = require('../utils/dbconnect');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Adding approval field to users table...');

        // Add approval_status field to users table
        await connection.execute(
            `ALTER TABLE users ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'`
        );
        console.log('Added approval_status field to users table.');

        // Add approved_by field to track who approved the user
        await connection.execute(
            `ALTER TABLE users ADD COLUMN approved_by VARCHAR(50) NULL`
        );
        console.log('Added approved_by field to users table.');

        // Add approved_at field to track when the user was approved
        await connection.execute(
            `ALTER TABLE users ADD COLUMN approved_at DATETIME NULL`
        );
        console.log('Added approved_at field to users table.');

        // Set existing users as approved (except pending ones)
        await connection.execute(
            `UPDATE users SET approval_status = 'approved' WHERE approval_status = 'pending'`
        );
        console.log('Set existing users as approved.');

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
