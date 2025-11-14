const db = require('../utils/dbconnect');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Creating complete orders table with all necessary columns...');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'create_complete_orders_table.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split the SQL content into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.substring(0, 100)}...`);
                await connection.execute(statement);
            }
        }

        await connection.commit();
        console.log('Migration completed successfully.');
        console.log('All necessary columns have been added to the orders table.');

    } catch (error) {
        await connection.rollback();
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    runMigration().catch(err => {
        console.error('Migration script failed:', err);
        process.exit(1);
    });
}

module.exports = runMigration;
