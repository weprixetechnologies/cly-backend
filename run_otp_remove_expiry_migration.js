const mysql = require('mysql2/promise');

async function removeOTPExpiry() {
    let connection;

    try {
        // Database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'adminuser',
            password: process.env.DB_PASSWORD || 'Vishal@13241',
            database: process.env.DB_NAME || 'clydb'
        });

        console.log('Connected to database successfully');

        // Check if table exists
        const [tables] = await connection.execute(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'signup_otps'",
            [process.env.DB_NAME || 'cly']
        );

        if (tables.length === 0) {
            console.log('⚠️  signup_otps table does not exist. Skipping migration.');
            return;
        }

        // Check if expiresAt column exists and is NOT NULL
        const [columns] = await connection.execute(
            "SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'signup_otps' AND COLUMN_NAME = 'expiresAt'",
            [process.env.DB_NAME || 'cly']
        );

        if (columns.length === 0) {
            console.log('⚠️  expiresAt column does not exist. Skipping migration.');
            return;
        }

        if (columns[0].IS_NULLABLE === 'YES') {
            console.log('✅ expiresAt column is already nullable. No changes needed.');
            return;
        }

        // Make expiresAt nullable
        console.log('🔄 Making expiresAt column nullable...');
        await connection.execute(
            'ALTER TABLE signup_otps MODIFY COLUMN expiresAt DATETIME NULL'
        );
        console.log('✅ Successfully made expiresAt column nullable');

        // Optionally remove the index on expiresAt since it's no longer needed
        try {
            console.log('🔄 Removing index on expiresAt...');
            await connection.execute('ALTER TABLE signup_otps DROP INDEX idx_expiresAt');
            console.log('✅ Successfully removed idx_expiresAt index');
        } catch (error) {
            // Index might not exist, which is fine
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('ℹ️  Index idx_expiresAt does not exist or already removed');
            } else {
                throw error;
            }
        }

        // Verify the change
        const [updatedColumns] = await connection.execute(
            "SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'signup_otps' AND COLUMN_NAME = 'expiresAt'",
            [process.env.DB_NAME || 'cly']
        );
        console.log('📋 Updated column structure:');
        console.table(updatedColumns);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

// Run the migration
removeOTPExpiry();
