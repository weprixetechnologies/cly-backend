const mysql = require('mysql2/promise');

async function runOTPMigration() {
    let connection;

    try {
        // Database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'rseditz@222',
            database: process.env.DB_NAME || 'cly'
        });

        console.log('Connected to database successfully');

        // Create signup_otps table
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS signup_otps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                otp VARCHAR(6) NOT NULL,
                expiresAt DATETIME NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_expiresAt (expiresAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await connection.execute(createTableSQL);
        console.log('✅ Signup OTPs table created successfully');

        // Test the table
        const [rows] = await connection.execute('DESCRIBE signup_otps');
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
runOTPMigration();

