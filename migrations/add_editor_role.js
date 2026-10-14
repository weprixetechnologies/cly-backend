const db = require('../utils/dbconnect');

async function runMigration() {
    console.log('🚀 Running migration: ensure users.role supports editor...');
    try {
        await db.query(`
            ALTER TABLE users 
            MODIFY COLUMN role ENUM('user', 'admin', 'manager', 'editor') DEFAULT 'user'
        `);
        console.log('✅ Successfully updated users.role ENUM to include editor');
    } catch (err) {
        console.log('Note on users.role migration:', err.message);
    }
}

module.exports = { runMigration };

if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('Migration finished');
            process.exit(0);
        })
        .catch(err => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}
