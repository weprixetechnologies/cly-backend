const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runPasswordResetMigration() {
    let connection;

    try {
        // Database connection
        connection = await mysql.createConnection({
            host: '72.60.219.181',
            user: 'root',
            password: 'rseditz@222',
            database: 'cly'
        });

        console.log('Connected to database successfully');

        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', 'create_password_reset_tokens_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await connection.execute(migrationSQL);
        console.log('✅ Password reset tokens table created successfully');

        // Test the table
        const [rows] = await connection.execute('DESCRIBE password_reset_tokens');
        console.log('📋 Table structure:');
        console.table(rows);

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
runPasswordResetMigration();
