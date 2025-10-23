const db = require('../utils/dbconnect');

// Get all contact details
async function getAllContactDetails() {
    try {
        const query = `SELECT * FROM contact_details ORDER BY display_order, created_at DESC`;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        throw new Error(`Error fetching contact details: ${error.message}`);
    }
}

// Get active contact details for public display
async function getActiveContactDetails() {
    try {
        const query = `SELECT * FROM contact_details WHERE is_active = TRUE ORDER BY display_order`;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        throw new Error(`Error fetching active contact details: ${error.message}`);
    }
}

// Get contact details by type
async function getContactDetailsByType(type) {
    try {
        const query = `SELECT * FROM contact_details WHERE type = ? AND is_active = TRUE ORDER BY display_order`;
        const [rows] = await db.execute(query, [type]);
        return rows;
    } catch (error) {
        throw new Error(`Error fetching contact details by type: ${error.message}`);
    }
}

// Get contact detail by ID
async function getContactDetailById(id) {
    try {
        const query = `SELECT * FROM contact_details WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching contact detail by ID: ${error.message}`);
    }
}

// Create new contact detail
async function createContactDetail(contactData) {
    try {
        const { type, label, value, display_order = 0 } = contactData;

        const query = `
            INSERT INTO contact_details (type, label, value, display_order, is_active) 
            VALUES (?, ?, ?, ?, TRUE)
        `;
        const [result] = await db.execute(query, [type, label, value, display_order]);
        return result.insertId;
    } catch (error) {
        throw new Error(`Error creating contact detail: ${error.message}`);
    }
}

// Update contact detail
async function updateContactDetail(id, contactData) {
    try {
        const allowedFields = ['type', 'label', 'value', 'display_order', 'is_active'];
        const updateFields = [];
        const values = [];

        // Only update allowed fields
        Object.keys(contactData).forEach(key => {
            if (allowedFields.includes(key) && contactData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(contactData[key]);
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(id);

        const query = `
            UPDATE contact_details 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating contact detail: ${error.message}`);
    }
}

// Delete contact detail
async function deleteContactDetail(id) {
    try {
        const query = `DELETE FROM contact_details WHERE id = ?`;
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error deleting contact detail: ${error.message}`);
    }
}

// Update display order for multiple contact details
async function updateDisplayOrder(updates) {
    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const { id, display_order } of updates) {
                const query = `UPDATE contact_details SET display_order = ? WHERE id = ?`;
                await connection.execute(query, [display_order, id]);
            }
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        throw new Error(`Error updating display order: ${error.message}`);
    }
}

module.exports = {
    getAllContactDetails,
    getActiveContactDetails,
    getContactDetailsByType,
    getContactDetailById,
    createContactDetail,
    updateContactDetail,
    deleteContactDetail,
    updateDisplayOrder
};
