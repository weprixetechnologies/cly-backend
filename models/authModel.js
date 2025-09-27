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
        const { uid, username, name, emailID, phoneNumber, gstin, password, role } = userData;

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const query = `INSERT INTO users (uid, username, name, emailID, phoneNumber, gstin, password, role, createdAt, updatedAt) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
        const params = [uid, username, name, emailID, phoneNumber, gstin, hashedPassword, role];

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

        const query = `INSERT INTO sessions (sessionID, refreshToken, uid, expiry, device, createdAt) 
                       VALUES (?, ?, ?, ?, ?, NOW())`;
        const params = [sessionID, refreshToken, uid, expiry, device];

        if (connection) {
            await connection.execute(query, params);
        } else {
            await db.execute(query, params);
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
        const query = 'UPDATE sessions SET refreshToken = ?, expiry = ? WHERE refreshToken = ?';
        const params = [newRefreshToken, newExpiry, oldRefreshToken];

        if (connection) {
            const [result] = await connection.execute(query, params);
            return result.affectedRows > 0;
        } else {
            const [result] = await db.execute(query, params);
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
    rollbackTransaction
};
