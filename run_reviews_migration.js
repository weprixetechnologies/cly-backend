#!/usr/bin/env node
require('dotenv').config();
const runMigration = require('./migrations/create_reviews_tables');

console.log('🚀 Starting reviews database migration...');
console.log('This will add all necessary tables and columns for reviews and ratings.');
console.log('');

runMigration()
    .then(() => {
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('Reviews module database setup is complete.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('Please check your database connection and try again.');
        process.exit(1);
    });
