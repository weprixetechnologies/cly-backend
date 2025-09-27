/*
  Migration: Change orders.orderStatus enum to ('pending','accepted','rejected')
  - Converts existing values: 'confirmed' -> 'accepted', 'cancelled' -> 'rejected'
  - Leaves 'pending' as-is; other values are coerced to 'pending'
*/
require('dotenv').config();
const db = require('../utils/dbconnect');

(async () => {
    const connection = await db.getConnection();
    try {
        console.log('[migration] Starting orderStatus enum migration...');
        await connection.beginTransaction();

        // 1) Normalize existing data to the target values before altering enum
        console.log('[migration] Updating existing rows: confirmed->accepted, cancelled->rejected');
        await connection.execute(`UPDATE orders SET orderStatus = 'accepted' WHERE orderStatus = 'confirmed'`);
        await connection.execute(`UPDATE orders SET orderStatus = 'rejected' WHERE orderStatus = 'cancelled'`);

        // Any other non-target values -> pending (e.g., shipped, delivered)
        console.log('[migration] Coercing other states to pending');
        await connection.execute(`UPDATE orders SET orderStatus = 'pending' WHERE orderStatus NOT IN ('pending','accepted','rejected')`);

        // 2) Alter the column enum definition
        console.log('[migration] Altering enum to (pending, accepted, rejected)');
        await connection.execute(`
      ALTER TABLE orders
      MODIFY COLUMN orderStatus ENUM('pending','accepted','rejected') DEFAULT 'pending'
    `);

        await connection.commit();
        console.log('[migration] orderStatus enum migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('[migration] Failed:', error.message);
        try { await connection.rollback(); } catch (_) { }
        process.exit(1);
    } finally {
        connection.release();
    }
})();


