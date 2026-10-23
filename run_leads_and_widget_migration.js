#!/usr/bin/env node
require('dotenv').config();
const runMigration = require('./migrations/create_leads_and_widget_tables');

console.log('🚀 Starting Leads & Chatbot Widget database migration...');
console.log('This will create the `leads` table and seed default widget & chatbot settings.');
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
        console.error('Please check your database credentials in backend/.env and ensure MySQL is running.');
        process.exit(1);
    });
