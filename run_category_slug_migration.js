#!/usr/bin/env node
require('dotenv').config();
const runMigration = require('./migrations/add_slug_to_categories');

console.log('🚀 Starting category slug migration...');
console.log('This will add the slug column to categories table and generate SEO-friendly slugs.');
console.log('');

runMigration()
    .then(() => {
        console.log('');
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    });
