const db = require('../utils/dbconnect');

// Helper: derive cartID for a user
function getCartIdForUser(uid) {
    return `CART_${uid}`;
}

// Get cart items for a user
async function getCartByUser(uid) {
    try {
        const cartID = getCartIdForUser(uid);
        const [rows] = await db.execute(
            `SELECT cartID, productID, productName, boxQty, packQty, units, featuredImage, uid, createdAt, updatedAt
             FROM cart_items WHERE cartID = ? AND uid = ? ORDER BY createdAt DESC`,
            [cartID, uid]
        );
        return { cartID, items: rows };
    } catch (error) {
        throw new Error(`Error fetching cart: ${error.message}`);
    }
}

// Add or update an item in cart
async function upsertCartItem(uid, item) {
    try {
        const cartID = getCartIdForUser(uid);
        const {
            productID,
            productName,
            featuredImage,
            boxQty = 0,
            packQty = 0,
            units = 0
        } = item;

        // Insert or update
        const [result] = await db.execute(
            `INSERT INTO cart_items (cartID, productID, productName, boxQty, packQty, units, featuredImage, uid)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               productName = VALUES(productName),
               featuredImage = VALUES(featuredImage),
               boxQty = boxQty + VALUES(boxQty),
               packQty = packQty + VALUES(packQty),
               units = units + VALUES(units),
               updatedAt = CURRENT_TIMESTAMP`,
            [cartID, productID, productName, boxQty, packQty, units, featuredImage, uid]
        );

        return { affectedRows: result.affectedRows, cartID };
    } catch (error) {
        throw new Error(`Error upserting cart item: ${error.message}`);
    }
}

// Update item quantities (set, not increment)
async function updateCartItem(uid, productID, quantities) {
    try {
        const cartID = getCartIdForUser(uid);
        const { boxQty, packQty, units } = quantities;

        const [result] = await db.execute(
            `UPDATE cart_items SET 
               boxQty = ?,
               packQty = ?,
               units = ?,
               updatedAt = CURRENT_TIMESTAMP
             WHERE cartID = ? AND productID = ? AND uid = ?`,
            [boxQty ?? 0, packQty ?? 0, units ?? 0, cartID, productID, uid]
        );

        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating cart item: ${error.message}`);
    }
}

// Remove a single item
async function removeCartItem(uid, productID) {
    try {
        const cartID = getCartIdForUser(uid);
        const [result] = await db.execute(
            `DELETE FROM cart_items WHERE cartID = ? AND productID = ? AND uid = ?`,
            [cartID, productID, uid]
        );
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error removing cart item: ${error.message}`);
    }
}

// Clear cart
async function clearCart(uid) {
    try {
        const cartID = getCartIdForUser(uid);
        const [result] = await db.execute(
            `DELETE FROM cart_items WHERE cartID = ? AND uid = ?`,
            [cartID, uid]
        );
        return result.affectedRows;
    } catch (error) {
        throw new Error(`Error clearing cart: ${error.message}`);
    }
}

// Clean up duplicate cart items by combining quantities
async function cleanupDuplicateItems(uid) {
    try {
        const cartID = getCartIdForUser(uid);

        // Get all cart items grouped by productID
        const [rows] = await db.execute(
            `SELECT productID, productName, featuredImage, 
                    SUM(boxQty) as totalBoxQty, 
                    SUM(packQty) as totalPackQty, 
                    SUM(units) as totalUnits
             FROM cart_items 
             WHERE cartID = ? AND uid = ? 
             GROUP BY productID, productName, featuredImage`,
            [cartID, uid]
        );

        // Delete all existing items for this cart
        await db.execute(
            `DELETE FROM cart_items WHERE cartID = ? AND uid = ?`,
            [cartID, uid]
        );

        // Insert consolidated items
        for (const item of rows) {
            await db.execute(
                `INSERT INTO cart_items (cartID, productID, productName, boxQty, packQty, units, featuredImage, uid)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [cartID, item.productID, item.productName, item.totalBoxQty, item.totalPackQty, item.totalUnits, item.featuredImage, uid]
            );
        }

        return rows.length;
    } catch (error) {
        throw new Error(`Error cleaning up duplicate items: ${error.message}`);
    }
}

module.exports = {
    getCartByUser,
    upsertCartItem,
    updateCartItem,
    removeCartItem,
    clearCart,
    cleanupDuplicateItems,
    getCartIdForUser
};



