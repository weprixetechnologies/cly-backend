const db = require('../utils/dbconnect');

async function checkUsers() {
    try {
        const [rows] = await db.query('SELECT uid, emailID, role, name FROM users');
        console.log('--- ALL USERS ---');
        console.log(rows);
        process.exit(0);
    } catch (err) {
        console.error('Error querying users:', err);
        process.exit(1);
    }
}

checkUsers();
