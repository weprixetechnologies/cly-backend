const db = require('../utils/dbconnect');

// Get all users with pagination and filters
const getAllUsers = async ({ page, limit, search, status, role }) => {
    try {
        // Ensure limit and page are integers with proper defaults
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        let whereConditions = [];
        let queryParams = [];

        // Search filter
        if (search && search.trim() !== '') {
            whereConditions.push(`(name LIKE ? OR username LIKE ? OR emailID LIKE ?)`);
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Status filter
        if (status && status !== 'all') {
            whereConditions.push(`status = ?`);
            queryParams.push(status);
        }

        // Role filter
        if (role && role !== 'all') {
            whereConditions.push(`role = ?`);
            queryParams.push(role);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
        const [countResult] = await db.execute(countQuery, queryParams);
        const totalUsers = countResult[0].total;

        // Get users with pagination - directly inject LIMIT and OFFSET values
        const usersQuery = `
            SELECT 
                uid, username, name, photo, emailID, phoneNumber, gstin, 
                outstanding, createdAt, updatedAt, lastLogin, status, role
            FROM users 
            ${whereClause}
            ORDER BY createdAt DESC 
            LIMIT ${limitNum} OFFSET ${offset}
        `;

        const users = await db.execute(usersQuery, queryParams);
        const totalPages = Math.ceil(totalUsers / limitNum);

        return {
            users: users[0],
            totalUsers,
            totalPages
        };
    } catch (error) {
        console.error('Error in getAllUsers service:', error);
        throw error;
    }
};

// Get user by ID
const getUserById = async (uid) => {
    try {
        const query = `
      SELECT 
        uid, username, name, photo, emailID, phoneNumber, gstin, 
        outstanding, createdAt, updatedAt, lastLogin, status, role
      FROM users 
      WHERE uid = ?
    `;

        const [rows] = await db.execute(query, [uid]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error in getUserById service:', error);
        throw error;
    }
};

// Update user
const updateUser = async (uid, updateData) => {
    try {
        const allowedFields = ['name', 'phoneNumber', 'gstin', 'outstanding', 'status', 'role', 'photo'];
        const updateFields = [];
        const values = [];

        // Only update allowed fields
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        // Add updatedAt timestamp
        updateFields.push('updatedAt = CURRENT_TIMESTAMP');

        const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE uid = ?
    `;

        const [result] = await db.execute(query, [...values, uid]);

        if (result.affectedRows === 0) {
            return null;
        }

        // Return updated user
        return await getUserById(uid);
    } catch (error) {
        console.error('Error in updateUser service:', error);
        throw error;
    }
};

// Delete user
const deleteUser = async (uid) => {
    try {
        const query = 'DELETE FROM users WHERE uid = ?';
        const [result] = await db.execute(query, [uid]);

        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error in deleteUser service:', error);
        throw error;
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
};
