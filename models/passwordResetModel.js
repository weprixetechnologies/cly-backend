const db = require('../utils/dbconnect');

class PasswordResetModel {
    // Create a new password reset token
    async createResetToken(userId, email, token, expiresAt) {
        try {
            const [result] = await db.execute(
                'INSERT INTO password_reset_tokens (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)',
                [userId, email, token, expiresAt]
            );
            return result.insertId;
        } catch (error) {
            throw new Error(`Error creating reset token: ${error.message}`);
        }
    }

    // Find a valid reset token
    async findValidToken(token) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used = FALSE ORDER BY created_at DESC LIMIT 1',
                [token]
            );
            return rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding reset token: ${error.message}`);
        }
    }

    // Mark a token as used
    async markTokenAsUsed(token) {
        try {
            const [result] = await db.execute(
                'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
                [token]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error marking token as used: ${error.message}`);
        }
    }

    // Clean up expired tokens
    async cleanupExpiredTokens() {
        try {
            const [result] = await db.execute(
                'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE'
            );
            return result.affectedRows;
        } catch (error) {
            throw new Error(`Error cleaning up expired tokens: ${error.message}`);
        }
    }

    // Get all tokens for a user (for debugging)
    async getTokensByUserId(userId) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            return rows;
        } catch (error) {
            throw new Error(`Error getting tokens by user ID: ${error.message}`);
        }
    }

    // Delete all tokens for a user
    async deleteTokensByUserId(userId) {
        try {
            const [result] = await db.execute(
                'DELETE FROM password_reset_tokens WHERE user_id = ?',
                [userId]
            );
            return result.affectedRows;
        } catch (error) {
            throw new Error(`Error deleting tokens by user ID: ${error.message}`);
        }
    }
}

module.exports = new PasswordResetModel();
