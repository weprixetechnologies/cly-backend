#!/usr/bin/env node

const runMigration = require('./migrations/create_complete_orders_table');

console.log('🚀 Starting database migration...');
console.log('This will add all necessary columns to the orders table.');
console.log('');

runMigration()
    .then(() => {
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('The orders table now has all necessary columns.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('Please check your database connection and try again.');
        process.exit(1);
    });
