const db = require('../utils/dbconnect');

// Get all policies
async function getAllPolicies() {
    try {
        const query = `SELECT * FROM policies ORDER BY type, created_at DESC`;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        throw new Error(`Error fetching policies: ${error.message}`);
    }
}

// Get active policies for public display
async function getActivePolicies() {
    try {
        const query = `SELECT * FROM policies WHERE is_active = TRUE ORDER BY type`;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        throw new Error(`Error fetching active policies: ${error.message}`);
    }
}

// Get policy by type
async function getPolicyByType(type) {
    try {
        const query = `SELECT * FROM policies WHERE type = ? AND is_active = TRUE ORDER BY updated_at DESC LIMIT 1`;
        const [rows] = await db.execute(query, [type]);
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching policy by type: ${error.message}`);
    }
}

// Get policy by ID
async function getPolicyById(id) {
    try {
        const query = `SELECT * FROM policies WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching policy by ID: ${error.message}`);
    }
}

// Create new policy
async function createPolicy(policyData) {
    try {
        const { type, title, content, version = '1.0', created_by } = policyData;

        // First, deactivate any existing active policy of the same type
        const deactivateQuery = `UPDATE policies SET is_active = FALSE WHERE type = ? AND is_active = TRUE`;
        await db.execute(deactivateQuery, [type]);

        // Create new policy
        const query = `
            INSERT INTO policies (type, title, content, version, is_active, created_by) 
            VALUES (?, ?, ?, ?, TRUE, ?)
        `;
        const [result] = await db.execute(query, [type, title, content, version, created_by]);
        return result.insertId;
    } catch (error) {
        throw new Error(`Error creating policy: ${error.message}`);
    }
}

// Update policy
async function updatePolicy(id, policyData) {
    try {
        const { title, content, version, updated_by } = policyData;
        const allowedFields = ['title', 'content', 'version'];
        const updateFields = [];
        const values = [];

        // Only update allowed fields
        Object.keys(policyData).forEach(key => {
            if (allowedFields.includes(key) && policyData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(policyData[key]);
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        // Add updated_by and updated_at
        updateFields.push('updated_by = ?');
        values.push(updated_by);
        values.push(id);

        const query = `
            UPDATE policies 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating policy: ${error.message}`);
    }
}

// Activate policy (deactivate others of same type)
async function activatePolicy(id, type) {
    try {
        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Deactivate all policies of the same type
            const deactivateQuery = `UPDATE policies SET is_active = FALSE WHERE type = ?`;
            await connection.execute(deactivateQuery, [type]);

            // Activate the specified policy
            const activateQuery = `UPDATE policies SET is_active = TRUE WHERE id = ?`;
            const [result] = await connection.execute(activateQuery, [id]);

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        throw new Error(`Error activating policy: ${error.message}`);
    }
}

// Delete policy
async function deletePolicy(id) {
    try {
        const query = `DELETE FROM policies WHERE id = ?`;
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error deleting policy: ${error.message}`);
    }
}

module.exports = {
    getAllPolicies,
    getActivePolicies,
    getPolicyByType,
    getPolicyById,
    createPolicy,
    updatePolicy,
    activatePolicy,
    deletePolicy
};
