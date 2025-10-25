const db = require('../utils/dbconnect');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Starting migration: Creating sessions and users tables...');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'create_sessions_table.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon and execute each statement
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Executing:', statement.substring(0, 100) + '...');
                await connection.execute(statement);
            }
        }

        await connection.commit();
        console.log('Migration completed successfully. Sessions and users tables created.');
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

