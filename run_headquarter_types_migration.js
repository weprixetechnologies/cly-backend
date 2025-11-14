#!/usr/bin/env node

const runMigration = require('./migrations/add_headquarter_address_phone_types');

console.log('🚀 Starting database migration...');
console.log('This will add headquarter_address and headquarter_phone types to the contact_details table.');
console.log('');

runMigration()
    .then(() => {
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('The contact_details table now supports headquarter_address and headquarter_phone types.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('Please check your database connection and try again.');
        process.exit(1);
    });

