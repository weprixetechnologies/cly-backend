const db = require('../utils/dbconnect');

async function addRemarksPhotosColumn() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Add remarks_photos column to orders table (store as JSON array of photo URLs)
        await connection.execute(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS remarks_photos JSON DEFAULT NULL AFTER remarks
        `);

        await connection.commit();
        console.log('✓ Successfully added remarks_photos column to orders table');
    } catch (error) {
        await connection.rollback();
        console.error('✗ Error adding remarks_photos column:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the migration
if (require.main === module) {
    addRemarksPhotosColumn()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addRemarksPhotosColumn;

