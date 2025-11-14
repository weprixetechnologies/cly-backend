const db = require('../utils/dbconnect');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Adding headquarter_address and headquarter_phone types to contact_details table...');

        // Add 'headquarter_address' and 'headquarter_phone' to the ENUM type
        const alterQuery = `
            ALTER TABLE contact_details 
            MODIFY COLUMN type ENUM('email', 'phone', 'address', 'social_media', 'other', 'headquarter', 'headquarter_address', 'headquarter_phone') NOT NULL
        `;

        console.log('Executing: ALTER TABLE contact_details MODIFY COLUMN type...');
        await connection.execute(alterQuery);

        // Optionally: Migrate existing 'headquarter' types to appropriate new types based on label
        const migrateQuery = `
            UPDATE contact_details 
            SET type = CASE 
                WHEN label LIKE '%Address%' OR label LIKE '%address%' THEN 'headquarter_address'
                WHEN label LIKE '%Phone%' OR label LIKE '%phone%' THEN 'headquarter_phone'
                ELSE 'headquarter_address'
            END
            WHERE type = 'headquarter'
        `;

        console.log('Migrating existing headquarter records to new types...');
        await connection.execute(migrateQuery);

        await connection.commit();
        console.log('✅ Migration completed successfully.');
        console.log('The contact_details table now supports headquarter_address and headquarter_phone types.');

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

