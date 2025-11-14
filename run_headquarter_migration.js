#!/usr/bin/env node

const runMigration = require('./migrations/add_headquarter_type_to_contacts');

console.log('🚀 Starting database migration...');
console.log('This will add the headquarter type to the contact_details table.');
console.log('');

runMigration()
    .then(() => {
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('The contact_details table now supports the headquarter type.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('Please check your database connection and try again.');
        process.exit(1);
    });

