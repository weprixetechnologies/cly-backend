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
            `SELECT 
                ci.cartID, 
                ci.productID, 
                ci.productName, 
                ci.units, 
                ci.featuredImage, 
                ci.uid, 
                ci.createdAt, 
                ci.updatedAt,
                p.minQty,
                p.productPrice,
                p.inventory,
                p.boxQty
             FROM cart_items ci
             LEFT JOIN products p ON ci.productID = p.productID
             WHERE ci.cartID = ? AND ci.uid = ? 
             ORDER BY ci.createdAt DESC`,
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
            units = 0
        } = item;

        // First check if item already exists in cart
        const [existingItems] = await db.execute(
            'SELECT units FROM cart_items WHERE cartID = ? AND productID = ? AND uid = ?',
            [cartID, productID, uid]
        );

        if (existingItems.length > 0) {
            // Item exists, update the quantity by adding new units
            const currentUnits = existingItems[0].units || 0;
            const newTotalUnits = currentUnits + units;

            const [result] = await db.execute(
                'UPDATE cart_items SET units = ?, productName = ?, featuredImage = ?, updatedAt = CURRENT_TIMESTAMP WHERE cartID = ? AND productID = ? AND uid = ?',
                [newTotalUnits, productName, featuredImage, cartID, productID, uid]
            );

            return { affectedRows: result.affectedRows, cartID, action: 'updated' };
        } else {
            // Item doesn't exist, insert new item
            const [result] = await db.execute(
                'INSERT INTO cart_items (cartID, productID, productName, boxQty, units, featuredImage, uid) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [cartID, productID, productName, 0, units, featuredImage, uid]
            );

            return { affectedRows: result.affectedRows, cartID, action: 'inserted' };
        }
    } catch (error) {
        throw new Error(`Error upserting cart item: ${error.message}`);
    }
}

// Update item quantities (set, not increment)
async function updateCartItem(uid, productID, quantities) {
    try {
        const cartID = getCartIdForUser(uid);
        const { units } = quantities;

        const [result] = await db.execute(
            'UPDATE cart_items SET \n               boxQty = 0,\n               units = ?,\n               updatedAt = CURRENT_TIMESTAMP\n             WHERE cartID = ? AND productID = ? AND uid = ?',
            [units ?? 0, cartID, productID, uid]
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
            'DELETE FROM cart_items WHERE cartID = ? AND productID = ? AND uid = ?',
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
            'DELETE FROM cart_items WHERE cartID = ? AND uid = ?',
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
            'SELECT productID, productName, featuredImage, \n                    SUM(units) as totalUnits\n             FROM cart_items \n             WHERE cartID = ? AND uid = ? \n             GROUP BY productID, productName, featuredImage',
            [cartID, uid]
        );

        // Delete all existing items for this cart
        await db.execute(
            'DELETE FROM cart_items WHERE cartID = ? AND uid = ?',
            [cartID, uid]
        );

        // Insert consolidated items
        for (const item of rows) {
            await db.execute(
                'INSERT INTO cart_items (cartID, productID, productName, boxQty, units, featuredImage, uid)\n                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [cartID, item.productID, item.productName, 0, item.totalUnits, item.featuredImage, uid]
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



