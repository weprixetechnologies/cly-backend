const db = require('../utils/dbconnect');
const crypto = require('crypto');

// Create address
async function createAddress(addressData, connection = null) {
    try {
        const addressID = crypto.randomUUID();
        const {
            userID,
            name,
            phone,
            addressLine1,
            addressLine2 = '',
            city,
            state,
            pincode,
            isDefault = false
        } = addressData;

        // If this is set as default, unset other default addresses for this user
        if (isDefault) {
            const unsetQuery = `UPDATE addresses SET isDefault = FALSE WHERE userID = ?`;
            if (connection) {
                await connection.execute(unsetQuery, [userID]);
            } else {
                await db.execute(unsetQuery, [userID]);
            }
        }

        const query = `
            INSERT INTO addresses (addressID, userID, name, phone, addressLine1, addressLine2, city, state, pincode, isDefault)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [addressID, userID, name, phone, addressLine1, addressLine2, city, state, pincode, isDefault];

        if (connection) {
            const [result] = await connection.execute(query, values);
            return { addressID, ...addressData };
        } else {
            const [result] = await db.execute(query, values);
            return { addressID, ...addressData };
        }
    } catch (error) {
        throw new Error(`Error creating address: ${error.message}`);
    }
}

// Get address by ID
async function getAddressById(addressID, connection = null) {
    try {
        const query = `SELECT * FROM addresses WHERE addressID = ?`;

        if (connection) {
            const [rows] = await connection.execute(query, [addressID]);
            return rows[0] || null;
        } else {
            const [rows] = await db.execute(query, [addressID]);
            return rows[0] || null;
        }
    } catch (error) {
        throw new Error(`Error getting address: ${error.message}`);
    }
}

// Get addresses by user ID
async function getAddressesByUserId(userID, connection = null) {
    try {
        const query = `SELECT * FROM addresses WHERE userID = ? ORDER BY isDefault DESC, createdAt DESC`;

        if (connection) {
            const [rows] = await connection.execute(query, [userID]);
            return rows;
        } else {
            const [rows] = await db.execute(query, [userID]);
            return rows;
        }
    } catch (error) {
        throw new Error(`Error getting user addresses: ${error.message}`);
    }
}

// Get default address for user
async function getDefaultAddressByUserId(userID, connection = null) {
    try {
        const query = `SELECT * FROM addresses WHERE userID = ? AND isDefault = TRUE LIMIT 1`;

        if (connection) {
            const [rows] = await connection.execute(query, [userID]);
            return rows[0] || null;
        } else {
            const [rows] = await db.execute(query, [userID]);
            return rows[0] || null;
        }
    } catch (error) {
        throw new Error(`Error getting default address: ${error.message}`);
    }
}

// Update address
async function updateAddress(addressID, updateData, connection = null) {
    try {
        const allowedFields = ['name', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'isDefault'];
        const updateFields = [];
        const values = [];

        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        // If setting as default, unset other default addresses for this user
        if (updateData.isDefault) {
            const address = await getAddressById(addressID, connection);
            if (address) {
                const unsetQuery = `UPDATE addresses SET isDefault = FALSE WHERE userID = ? AND addressID != ?`;
                if (connection) {
                    await connection.execute(unsetQuery, [address.userID, addressID]);
                } else {
                    await db.execute(unsetQuery, [address.userID, addressID]);
                }
            }
        }

        values.push(addressID);

        const query = `
            UPDATE addresses 
            SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
            WHERE addressID = ?
        `;

        if (connection) {
            const [result] = await connection.execute(query, values);
            return result.affectedRows > 0;
        } else {
            const [result] = await db.execute(query, values);
            return result.affectedRows > 0;
        }
    } catch (error) {
        throw new Error(`Error updating address: ${error.message}`);
    }
}

// Delete address
async function deleteAddress(addressID, connection = null) {
    try {
        const query = `DELETE FROM addresses WHERE addressID = ?`;

        if (connection) {
            const [result] = await connection.execute(query, [addressID]);
            return result.affectedRows > 0;
        } else {
            const [result] = await db.execute(query, [addressID]);
            return result.affectedRows > 0;
        }
    } catch (error) {
        throw new Error(`Error deleting address: ${error.message}`);
    }
}

// Set address as default
async function setDefaultAddress(addressID, userID, connection = null) {
    try {
        // Start transaction
        const conn = connection || await db.getConnection();
        if (!connection) await conn.beginTransaction();

        try {
            // Unset all other default addresses for this user
            const unsetQuery = `UPDATE addresses SET isDefault = FALSE WHERE userID = ?`;
            await conn.execute(unsetQuery, [userID]);

            // Set this address as default
            const setQuery = `UPDATE addresses SET isDefault = TRUE WHERE addressID = ? AND userID = ?`;
            const [result] = await conn.execute(setQuery, [addressID, userID]);

            if (!connection) await conn.commit();
            return result.affectedRows > 0;
        } catch (error) {
            if (!connection) await conn.rollback();
            throw error;
        } finally {
            if (!connection) conn.release();
        }
    } catch (error) {
        throw new Error(`Error setting default address: ${error.message}`);
    }
}

module.exports = {
    createAddress,
    getAddressById,
    getAddressesByUserId,
    getDefaultAddressByUserId,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
