const db = require('../utils/dbconnect');
const bcrypt = require('bcryptjs');

// Check if username exists
async function checkUsernameExists(username) {
    try {
        const [rows] = await db.execute(
            'SELECT uid FROM users WHERE username = ?',
            [username]
        );
        return rows.length > 0;
    } catch (error) {
        throw new Error(`Error checking username: ${error.message}`);
    }
}

// Check if email exists
async function checkEmailExists(emailID) {
    try {
        const [rows] = await db.execute(
            'SELECT uid FROM users WHERE emailID = ?',
            [emailID]
        );
        return rows.length > 0;
    } catch (error) {
        throw new Error(`Error checking email: ${error.message}`);
    }
}

// Check if UID exists
async function checkUIDExists(uid) {
    try {
        const [rows] = await db.execute(
            'SELECT uid FROM users WHERE uid = ?',
            [uid]
        );
        return rows.length > 0;
    } catch (error) {
        throw new Error(`Error checking UID: ${error.message}`);
    }
}

// Generate unique username from email
async function generateUniqueUsername(emailID) {
    const baseUsername = emailID.split('@')[0];
    let username = baseUsername;
    let counter = 1;

    while (await checkUsernameExists(username)) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    return username;
}

// Create new user
async function createUser(userData, connection = null) {
    try {
        const { uid, username, name, emailID, phoneNumber, gstin, password, role, approval_status, approved_by, approved_at } = userData;

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Format approved_at for MySQL
        const formattedApprovedAt = approved_at ? approved_at.toISOString().slice(0, 19).replace('T', ' ') : null;

        const query = `INSERT INTO users (uid, username, name, emailID, phoneNumber, gstin, password, role, approval_status, approved_by, approved_at, createdAt, updatedAt) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

        const params = [uid, username, name, emailID, phoneNumber, gstin, hashedPassword, role, approval_status, approved_by, formattedApprovedAt];

        let result;
        if (connection) {
            [result] = await connection.execute(query, params);
        } else {
            [result] = await db.execute(query, params);
        }

        return {
            uid,
            username,
            name,
            emailID,
            phoneNumber,
            gstin,
            role,
            approval_status,
            approved_by,
            approved_at,
            createdAt: new Date()
        };
    } catch (error) {
        throw new Error(`Error creating user: ${error.message}`);
    }
}

// Get user by email
async function getUserByEmail(emailID) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE emailID = ?',
            [emailID]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error getting user by email: ${error.message}`);
    }
}

// Get user by username
async function getUserByUsername(username) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error getting user by username: ${error.message}`);
    }
}

// Get user by UID
async function getUserByUID(uid) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE uid = ?',
            [uid]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error getting user by UID: ${error.message}`);
    }
}

// Create session
async function createSession(sessionData, connection = null) {
    try {
        const { sessionID, refreshToken, uid, expiry, device } = sessionData;

        // Convert Date object to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
        const formattedExpiry = expiry instanceof Date ?
            expiry.toISOString().slice(0, 19).replace('T', ' ') :
            expiry;

        const query = 'INSERT INTO sessions (sessionID, refreshToken, uid, expiry, device, createdAt) VALUES (?, ?, ?, ?, ?, NOW())';

        if (connection) {
            await connection.execute(query, [sessionID, refreshToken, uid, formattedExpiry, device]);
        } else {
            await db.execute(query, [sessionID, refreshToken, uid, formattedExpiry, device]);
        }

        return { sessionID, uid, expiry };
    } catch (error) {
        throw new Error(`Error creating session: ${error.message}`);
    }
}

// Delete session
async function deleteSession(sessionID) {
    try {
        await db.execute(
            'DELETE FROM sessions WHERE sessionID = ?',
            [sessionID]
        );
        return true;
    } catch (error) {
        throw new Error(`Error deleting session: ${error.message}`);
    }
}

// Get session by refresh token
async function getSessionByRefreshToken(refreshToken) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM sessions WHERE refreshToken = ? AND expiry > NOW()',
            [refreshToken]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error getting session: ${error.message}`);
    }
}

// Update session with new refresh token
async function updateSession(oldRefreshToken, newRefreshToken, newExpiry, connection = null) {
    try {
        // Convert Date object to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
        const formattedExpiry = newExpiry instanceof Date ?
            newExpiry.toISOString().slice(0, 19).replace('T', ' ') :
            newExpiry;

        const query = 'UPDATE sessions SET refreshToken = ?, expiry = ? WHERE refreshToken = ?';

        if (connection) {
            const [result] = await connection.execute(query, [newRefreshToken, formattedExpiry, oldRefreshToken]);
            return result.affectedRows > 0;
        } else {
            const [result] = await db.execute(query, [newRefreshToken, formattedExpiry, oldRefreshToken]);
            return result.affectedRows > 0;
        }
    } catch (error) {
        throw new Error(`Error updating session: ${error.message}`);
    }
}

// Update user last login
async function updateLastLogin(uid, connection = null) {
    try {
        const query = 'UPDATE users SET lastLogin = NOW(), updatedAt = NOW() WHERE uid = ?';

        if (connection) {
            await connection.execute(query, [uid]);
        } else {
            await db.execute(query, [uid]);
        }

        return true;
    } catch (error) {
        throw new Error(`Error updating last login: ${error.message}`);
    }
}

// Clear all sessions for a user
async function clearUserSessions(uid, connection = null) {
    try {
        const query = 'DELETE FROM sessions WHERE uid = ?';

        if (connection) {
            await connection.execute(query, [uid]);
        } else {
            await db.execute(query, [uid]);
        }

        return true;
    } catch (error) {
        throw new Error(`Error clearing user sessions: ${error.message}`);
    }
}

// Transaction helper functions
async function beginTransaction() {
    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        return connection;
    } catch (error) {
        throw new Error(`Error beginning transaction: ${error.message}`);
    }
}

async function commitTransaction(connection) {
    try {
        await connection.commit();
        connection.release();
    } catch (error) {
        throw new Error(`Error committing transaction: ${error.message}`);
    }
}

async function rollbackTransaction(connection) {
    try {
        await connection.rollback();
        connection.release();
    } catch (error) {
        throw new Error(`Error rolling back transaction: ${error.message}`);
    }
}

// Get users by approval status
async function getUsersByApprovalStatus(status) {
    try {
        const [rows] = await db.execute(
            'SELECT uid, username, name, emailID, phoneNumber, gstin, role, approval_status, approved_by, approved_at, outstanding, status, photo, createdAt FROM users WHERE approval_status = ? ORDER BY createdAt DESC',
            [status]
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching users by approval status: ${error.message}`);
    }
}

// Get all users
async function getAllUsers() {
    try {
        const [rows] = await db.execute(
            'SELECT uid, username, name, emailID, phoneNumber, gstin, role, approval_status, approved_by, approved_at, outstanding, status, photo, createdAt FROM users ORDER BY createdAt DESC'
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching all users: ${error.message}`);
    }
}

// Update user approval status
async function updateUserApproval(uid, status, approvedBy) {
    try {
        const [result] = await db.execute(
            'UPDATE users SET approval_status = ?, approved_by = ?, approved_at = NOW() WHERE uid = ?',
            [status, approvedBy, uid]
        );
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating user approval: ${error.message}`);
    }
}

// Get user by UID (updated version)
async function getUserByUid(uid) {
    try {
        const [rows] = await db.execute(
            'SELECT uid, username, name, emailID, phoneNumber, gstin, role, approval_status, approved_by, approved_at, outstanding, status, photo, createdAt FROM users WHERE uid = ?',
            [uid]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw new Error(`Error fetching user by UID: ${error.message}`);
    }
}

// Update user details
async function updateUser(uid, updateData) {
    try {
        const { name, emailID, phoneNumber, gstin, approval_status, approved_by, approved_at, photo, outstanding, status, role } = updateData;

        let query = 'UPDATE users SET name = ?, emailID = ?, phoneNumber = ?, gstin = ?, approval_status = ?';
        let params = [name, emailID, phoneNumber, gstin, approval_status];

        // Add optional fields if provided
        if (photo !== undefined) {
            query += ', photo = ?';
            params.push(photo);
        }

        if (outstanding !== undefined) {
            query += ', outstanding = ?';
            params.push(outstanding);
        }

        if (status !== undefined) {
            query += ', status = ?';
            params.push(status);
        }

        if (role !== undefined) {
            query += ', role = ?';
            params.push(role);
        }

        // Add approval fields if provided
        if (approved_by !== undefined) {
            query += ', approved_by = ?';
            params.push(approved_by);
        }

        if (approved_at !== undefined) {
            query += ', approved_at = ?';
            params.push(approved_at);
        }

        query += ', updatedAt = NOW() WHERE uid = ?';
        params.push(uid);

        const [result] = await db.execute(query, params);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating user: ${error.message}`);
    }
}

// Update user password
async function updateUserPassword(uid, hashedPassword) {
    try {
        const [result] = await db.execute(
            'UPDATE users SET password = ?, updatedAt = NOW() WHERE uid = ?',
            [hashedPassword, uid]
        );
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating user password: ${error.message}`);
    }
}

module.exports = {
    checkUsernameExists,
    checkEmailExists,
    checkUIDExists,
    generateUniqueUsername,
    createUser,
    getUserByEmail,
    getUserByUsername,
    getUserByUID,
    createSession,
    deleteSession,
    getSessionByRefreshToken,
    updateSession,
    updateLastLogin,
    clearUserSessions,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    getUsersByApprovalStatus,
    getAllUsers,
    updateUserApproval,
    getUserByUid,
    updateUser,
    updateUserPassword
};
