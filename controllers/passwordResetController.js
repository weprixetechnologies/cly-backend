const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const passwordResetModel = require('../models/passwordResetModel');
const emailService = require('../services/emailService');
const authModel = require('../models/authModel');

// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if user exists
        const user = await authModel.getUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Clean up any existing tokens for this user
        await passwordResetModel.deleteTokensByUserId(user.uid);

        // Create new reset token
        await passwordResetModel.createResetToken(user.uid, email, resetToken, expiresAt);

        // Send reset email
        const emailResult = await emailService.sendPasswordResetEmail(
            email,
            resetToken,
            user.name || user.emailID
        );

        if (!emailResult.success) {
            console.error('Failed to send password reset email:', emailResult.error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send password reset email. Please try again later.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Request password reset error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Reset token is required'
            });
        }

        const resetToken = await passwordResetModel.findValidToken(token);

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Reset token is valid',
            data: {
                email: resetToken.email,
                expiresAt: resetToken.expires_at
            }
        });

    } catch (error) {
        console.error('Verify reset token error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Reset token and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Find valid reset token
        const resetToken = await passwordResetModel.findValidToken(token);

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password
        const updateResult = await authModel.updateUserPassword(resetToken.user_id, hashedPassword);

        if (!updateResult) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update password. Please try again.'
            });
        }

        // Mark token as used
        await passwordResetModel.markTokenAsUsed(token);

        // Clean up expired tokens
        await passwordResetModel.cleanupExpiredTokens();

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
};

// Clean up expired tokens (admin endpoint)
const cleanupExpiredTokens = async (req, res) => {
    try {
        const deletedCount = await passwordResetModel.cleanupExpiredTokens();

        res.status(200).json({
            success: true,
            message: `Cleaned up ${deletedCount} expired tokens`,
            data: { deletedCount }
        });

    } catch (error) {
        console.error('Cleanup expired tokens error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
    cleanupExpiredTokens
};
