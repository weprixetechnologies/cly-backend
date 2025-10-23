const db = require('../utils/dbconnect');

// Create addresses table
const createAddressesTable = async (req, res) => {
    try {
        // Create addresses table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS addresses (
                addressID VARCHAR(50) PRIMARY KEY,
                userID VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                addressLine1 VARCHAR(500) NOT NULL,
                addressLine2 VARCHAR(500),
                city VARCHAR(100) NOT NULL,
                state VARCHAR(100) NOT NULL,
                pincode VARCHAR(10) NOT NULL,
                isDefault BOOLEAN DEFAULT FALSE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_userID (userID),
                INDEX idx_isDefault (isDefault)
            )
        `);

        res.status(200).json({
            success: true,
            message: 'Addresses table created successfully'
        });
    } catch (error) {
        console.error('Error creating addresses table:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating addresses table',
            error: error.message
        });
    }
};

// Rename boxQty to boxes in orders table
const renameBoxQtyToBoxes = async (req, res) => {
    try {
        // Check if boxes column already exists
        const [columns] = await db.execute("SHOW COLUMNS FROM orders LIKE 'boxes'");
        if (columns.length > 0) {
            return res.status(200).json({ success: true, message: 'Migration already completed - boxes column exists' });
        }

        // Add the new boxes column
        await db.execute('ALTER TABLE orders ADD COLUMN boxes INT DEFAULT 0 AFTER boxQty');

        // Copy data from boxQty to boxes
        await db.execute('UPDATE orders SET boxes = boxQty');

        // Drop the old boxQty column
        await db.execute('ALTER TABLE orders DROP COLUMN boxQty');

        // Add index for better performance
        await db.execute('CREATE INDEX idx_orders_boxes ON orders(boxes)');

        res.status(200).json({ success: true, message: 'Successfully renamed boxQty to boxes in orders table' });
    } catch (error) {
        console.error('Error renaming boxQty to boxes:', error);
        res.status(500).json({ success: false, message: 'Failed to rename boxQty to boxes', error: error.message });
    }
};

module.exports = {
    createAddressesTable,
    renameBoxQtyToBoxes
};
