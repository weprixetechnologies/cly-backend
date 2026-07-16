const db = require('../utils/dbconnect');

class PasswordResetModel {

    // ─── Token-based methods (kept for email fallback) ────────────────────────

    // Create a new password reset record (token + optional sms_otp)
    async createResetToken(userId, email, token, expiresAt, smsOtp = null) {
        try {
            const [result] = await db.execute(
                'INSERT INTO password_reset_tokens (user_id, email, token, sms_otp, expires_at) VALUES (?, ?, ?, ?, ?)',
                [userId, email, token, smsOtp, expiresAt]
            );
            return result.insertId;
        } catch (error) {
            throw new Error(`Error creating reset token: ${error.message}`);
        }
    }

    // Find a valid reset token (link-based)
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

    // ─── SMS OTP methods ─────────────────────────────────────────────────────

    /**
     * Find the most recent valid OTP record for an email.
     * Valid = not expired, not used.
     */
    async findValidOTPByEmail(email) {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM password_reset_tokens
                 WHERE email = ? AND sms_otp IS NOT NULL
                   AND expires_at > NOW() AND used = FALSE
                 ORDER BY created_at DESC LIMIT 1`,
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding OTP: ${error.message}`);
        }
    }

    /**
     * Verify the SMS OTP for an email.
     * Returns the token record if valid, null otherwise.
     */
    async verifyOTP(email, otp) {
        try {
            const record = await this.findValidOTPByEmail(email);
            if (!record) return null;
            if (String(record.sms_otp) !== String(otp)) return null;
            return record;
        } catch (error) {
            throw new Error(`Error verifying OTP: ${error.message}`);
        }
    }

    /**
     * Mark OTP as used by record id.
     */
    async markOTPUsed(id) {
        try {
            const [result] = await db.execute(
                'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error marking OTP as used: ${error.message}`);
        }
    }

    /**
     * Invalidate all previous unused OTPs for the same email
     * so only the latest OTP is valid.
     */
    async invalidatePreviousOTPs(email) {
        try {
            await db.execute(
                `UPDATE password_reset_tokens
                 SET used = TRUE
                 WHERE email = ? AND sms_otp IS NOT NULL AND used = FALSE`,
                [email]
            );
        } catch (error) {
            // Non-fatal — log and move on
            console.warn('[PasswordResetModel] invalidatePreviousOTPs error:', error.message);
        }
    }

    // ─── Cleanup ─────────────────────────────────────────────────────────────

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

    // Get all tokens for a user (debugging)
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
