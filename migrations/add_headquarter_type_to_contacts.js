const db = require('../utils/dbconnect');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Adding headquarter type to contact_details table...');

        // Add 'headquarter' to the ENUM type
        const alterQuery = `
            ALTER TABLE contact_details 
            MODIFY COLUMN type ENUM('email', 'phone', 'address', 'social_media', 'other', 'headquarter') NOT NULL
        `;

        console.log('Executing: ALTER TABLE contact_details MODIFY COLUMN type...');
        await connection.execute(alterQuery);

        await connection.commit();
        console.log('✅ Migration completed successfully.');
        console.log('The contact_details table now supports the headquarter type.');

    } catch (error) {
        await connection.rollback();
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('');
            console.log('✅ Migration script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('');
            console.error('❌ Migration script failed:', error.message);
            process.exit(1);
        });
}

module.exports = runMigration;

