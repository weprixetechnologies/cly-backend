const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authModel = require('../models/authModel');

// Configuration
const accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-in-production-2024';
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production-2024';
const accessTokenExpiry = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Warn if using fallback secrets
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.warn('⚠️  Using fallback JWT secrets! Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in environment variables for production.');
}

// Generate unique UID (12-digit alphanumeric)
function generateUID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate unique UID with collision checking
async function generateUniqueUID() {
    let uid;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops

    do {
        uid = generateUID();
        attempts++;

        if (attempts > maxAttempts) {
            throw new Error('Unable to generate unique UID after multiple attempts');
        }
    } while (await authModel.checkUIDExists(uid));

    return uid;
}

// Generate session ID
function generateSessionID() {
    return crypto.randomBytes(32).toString('hex');
}

// Generate access token
function generateAccessToken(payload) {
    return jwt.sign(payload, accessTokenSecret, {
        expiresIn: accessTokenExpiry
    });
}

// Generate refresh token
function generateRefreshToken(payload) {
    return jwt.sign(payload, refreshTokenSecret, {
        expiresIn: refreshTokenExpiry
    });
}

// Verify access token
function verifyAccessToken(token) {
    try {
        return jwt.verify(token, accessTokenSecret);
    } catch (error) {
        throw new Error('Invalid access token');
    }
}

// Verify refresh token
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, refreshTokenSecret);
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
}

// Register user (admin or user)
async function registerUser(userData, role) {
    let connection = null;

    try {
        const { emailID, phoneNumber, name, password } = userData;

        // Validate required fields
        if (!emailID || !phoneNumber || !name || !password) {
            throw new Error('All fields are required');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailID)) {
            throw new Error('Invalid email format');
        }

        // Validate password strength
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Check if email already exists
        const emailExists = await authModel.checkEmailExists(emailID);
        if (emailExists) {
            throw new Error('Email already registered');
        }

        // Generate unique username from email
        const username = await authModel.generateUniqueUsername(emailID);

        // Generate unique UID with collision checking
        const uid = await generateUniqueUID();

        // Create user data
        const newUserData = {
            uid,
            username,
            name,
            emailID,
            phoneNumber,
            gstin: userData.gstin || null,
            password,
            role,
            approval_status: role === 'admin' ? 'approved' : 'pending', // Admin users are auto-approved
            approved_by: role === 'admin' ? 'system' : null,
            approved_at: role === 'admin' ? new Date() : null
        };

        // BEGIN TRANSACTION
        connection = await authModel.beginTransaction();

        // Create user in database (within transaction)
        const user = await authModel.createUser(newUserData, connection);

        // Generate tokens (if this fails, transaction will rollback)
        const accessTokenPayload = {
            uid: user.uid,
            username: user.username,
            role: user.role,
            type: 'access'
        };

        const refreshTokenPayload = {
            uid: user.uid,
            username: user.username,
            role: user.role,
            type: 'refresh'
        };

        const accessToken = generateAccessToken(accessTokenPayload);
        const refreshToken = generateRefreshToken(refreshTokenPayload);

        // Create session (within transaction)
        const sessionID = generateSessionID();
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7); // 7 days from now

        await authModel.createSession({
            sessionID,
            refreshToken,
            uid: user.uid,
            expiry,
            device: userData.device || 'unknown'
        }, connection);

        // COMMIT TRANSACTION - Only if everything succeeds
        await authModel.commitTransaction(connection);
        connection = null; // Prevent rollback in finally block

        return {
            success: true,
            message: `${role} registered successfully`,
            user: {
                uid: user.uid,
                username: user.username,
                name: user.name,
                emailID: user.emailID,
                phoneNumber: user.phoneNumber,
                gstin: user.gstin,
                role: user.role,
                createdAt: user.createdAt
            },
            tokens: {
                accessToken,
                refreshToken
            }
        };

    } catch (error) {
        // ROLLBACK TRANSACTION on any error
        if (connection) {
            try {
                await authModel.rollbackTransaction(connection);
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError.message);
            }
        }
        throw new Error(error.message);
    }
}

// Register admin
async function registerAdmin(userData) {
    return await registerUser(userData, 'admin');
}

// Register user
async function registerUserRole(userData) {
    return await registerUser(userData, 'user');
}

// Refresh access token
async function refreshAccessToken(refreshToken) {
    console.log('[RefreshAccessToken] Starting token refresh process');

    try {
        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        console.log('[RefreshAccessToken] Token decoded successfully:', {
            uid: decoded.uid,
            username: decoded.username,
            role: decoded.role,
            type: decoded.type
        });

        // Check if session exists and is valid
        const session = await authModel.getSessionByRefreshToken(refreshToken);
        if (!session) {
            console.log('[RefreshAccessToken] No valid session found for refresh token');
            throw new Error('Invalid refresh token - No Session');
        }

        console.log('[RefreshAccessToken] Session found:', {
            sessionId: session.sessionID,
            uid: session.uid,
            expiry: session.expiry
        });

        // Verify the refresh token matches the one in the database
        if (session.refreshToken !== refreshToken) {
            console.log('[RefreshAccessToken] Refresh token mismatch');
            throw new Error('Refresh token mismatch');
        }

        // Get user details
        const user = await authModel.getUserByUID(decoded.uid);
        if (!user) {
            console.log('[RefreshAccessToken] User not found for UID:', decoded.uid);
            throw new Error('User not found');
        }

        console.log('[RefreshAccessToken] User found:', {
            uid: user.uid,
            username: user.username,
            role: user.role
        });

        // Generate new access token
        const accessTokenPayload = {
            uid: user.uid,
            username: user.username,
            role: user.role,
            type: 'access'
        };

        const accessToken = generateAccessToken(accessTokenPayload);

        // Generate new refresh token
        const refreshTokenPayload = {
            uid: user.uid,
            username: user.username,
            role: user.role,
            type: 'refresh'
        };

        const newRefreshToken = generateRefreshToken(refreshTokenPayload);

        // Calculate new expiry date (30 days from now)
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);

        console.log('[RefreshAccessToken] Generated new tokens, updating session...');

        // Update session with new refresh token
        const sessionUpdated = await authModel.updateSession(refreshToken, newRefreshToken, newExpiry);
        if (!sessionUpdated) {
            console.log('[RefreshAccessToken] Failed to update session');
            throw new Error('Failed to update session');
        }

        console.log('[RefreshAccessToken] Session updated successfully');

        return {
            success: true,
            accessToken,
            refreshToken: newRefreshToken,
            user: {
                uid: user.uid,
                username: user.username,
                name: user.name,
                emailID: user.emailID,
                phoneNumber: user.phoneNumber,
                gstin: user.gstin,
                role: user.role
            }
        };

    } catch (error) {
        console.error('[RefreshAccessToken] Error:', {
            message: error.message,
            stack: error.stack
        });
        throw new Error(error.message);
    }
}

// Login user (admin or user)
async function loginUser(loginData, role) {
    let connection = null;

    try {
        const { emailID, password, device } = loginData;

        // Validate required fields
        if (!emailID || !password) {
            throw new Error('Email and password are required');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailID)) {
            throw new Error('Invalid email format');
        }

        // Get user by email
        const user = await authModel.getUserByEmail(emailID);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if user has the correct role
        if (user.role !== role) {
            throw new Error(`Access denied. This account is not authorized for ${role} login`);
        }

        // Check if user is approved (only for regular users, admins are auto-approved)
        if (user.role === 'user' && user.approval_status !== 'approved') {
            if (user.approval_status === 'pending') {
                throw new Error('Your account is pending approval. Please wait for admin approval.');
            } else if (user.approval_status === 'rejected') {
                throw new Error('Your account has been rejected. Please contact support.');
            }
        }

        // Verify password
        const bcrypt = require('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // BEGIN TRANSACTION
        connection = await authModel.beginTransaction();

        // Clear all existing sessions for this user (within transaction)
        await authModel.clearUserSessions(user.uid, connection);

        // Update last login timestamp (within transaction)
        await authModel.updateLastLogin(user.uid, connection);

        // Generate tokens
        const accessTokenPayload = {
            uid: user.uid,
            username: user.username,
            role: user.role,
            type: 'access'
        };

        const refreshTokenPayload = {
            uid: user.uid,
            username: user.username,
            role: user.role,
            type: 'refresh'
        };

        const accessToken = generateAccessToken(accessTokenPayload);
        const refreshToken = generateRefreshToken(refreshTokenPayload);

        // Create new session (within transaction)
        const sessionID = generateSessionID();
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7); // 7 days from now

        await authModel.createSession({
            sessionID,
            refreshToken,
            uid: user.uid,
            expiry,
            device: device || 'unknown'
        }, connection);

        // COMMIT TRANSACTION
        await authModel.commitTransaction(connection);
        connection = null; // Prevent rollback in finally block

        return {
            success: true,
            message: `${role} logged in successfully`,
            user: {
                uid: user.uid,
                username: user.username,
                name: user.name,
                emailID: user.emailID,
                phoneNumber: user.phoneNumber,
                gstin: user.gstin,
                role: user.role,
                createdAt: user.createdAt
            },
            tokens: {
                accessToken,
                refreshToken
            }
        };

    } catch (error) {
        // ROLLBACK TRANSACTION on any error
        if (connection) {
            try {
                await authModel.rollbackTransaction(connection);
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError.message);
            }
        }
        throw new Error(error.message);
    }
}

// Login admin
async function loginAdmin(loginData) {
    return await loginUser(loginData, 'admin');
}

// Login user
async function loginUserRole(loginData) {
    return await loginUser(loginData, 'user');
}

// Logout user
async function logout(refreshToken) {
    try {
        await authModel.deleteSession(refreshToken);
        return {
            success: true,
            message: 'Logged out successfully'
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = {
    registerAdmin,
    registerUserRole,
    loginAdmin,
    loginUserRole,
    refreshAccessToken,
    logout,
    verifyAccessToken,
    generateAccessToken,
    generateRefreshToken
};
