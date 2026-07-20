#!/usr/bin/env node
require('dotenv').config();
const runMigration = require('./migrations/create_site_reviews_table');

console.log('🚀 Starting site reviews database migration...');
console.log('This will add the site_reviews table for website/experience reviews.');
console.log('');

runMigration()
    .then(() => {
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('Site reviews module database setup is complete.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('Please check your database connection and try again.');
        process.exit(1);
    });
