#!/usr/bin/env node
require('dotenv').config();
const runMigration = require('./migrations/create_blog_tables');

console.log('🚀 Starting blog database migration...');
console.log('This will add all necessary tables for categories, posts, tags, and product links.');
console.log('');

runMigration()
    .then(() => {
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('Blog module database setup is complete.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('Please check your database connection and try again.');
        process.exit(1);
    });
