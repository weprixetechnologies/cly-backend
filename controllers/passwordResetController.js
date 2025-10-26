const passwordResetModel = require('../models/passwordResetModel');
const authModel = require('../models/authModel');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Request password reset
const requestPasswordReset = async (req, res) => {
    console.log('🔥 Password reset request received!');
    console.log('Request body:', req.body);

    try {
        const { email } = req.body;
        console.log('Extracted email:', email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if user exists
        console.log('🔍 Checking if user exists in database...');
        const user = await authModel.getUserByEmail(email);
        console.log('🔍 User lookup result:', user ? 'User found' : 'User not found');

        if (!user) {
            console.log('❌ User not found for email:', email);
            // For security, don't reveal that email doesn't exist
            return res.status(200).json({
                success: true,
                message: 'If a user with that email exists, a password reset link has been sent'
            });
        }

        console.log('✅ User found:', {
            uid: user.uid,
            name: user.name || user.username,
            email: user.emailID
        });

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
        console.log('🔐 Generated reset token');

        // Save reset token to database
        console.log('💾 Saving reset token to database...');
        await passwordResetModel.createResetToken(user.uid, email, resetToken, expiresAt);
        console.log('✅ Reset token saved to database');

        // Send password reset email
        console.log('🚀 Starting password reset email process...');
        console.log('📧 Email:', email);
        console.log('👤 User:', user.name || user.username);

        try {
            const emailResult = await emailService.sendPasswordResetEmail(email, resetToken, user.name || user.username);

            if (emailResult.success) {
                console.log('✅ Email sent successfully!');
            } else {
                console.error('❌ Email failed to send:', emailResult.error);
            }
        } catch (emailError) {
            console.error('❌ Email sending error:', emailError);
            console.error('Error stack:', emailError.stack);
            // Continue even if email fails - don't reveal error to user
        }

        res.status(200).json({
            success: true,
            message: 'If a user with that email exists, a password reset link has been sent'
        });

    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request',
            error: error.message
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

        // Find valid token
        const tokenData = await passwordResetModel.findValidToken(token);

        if (!tokenData) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: {
                email: tokenData.email,
                user_id: tokenData.user_id
            }
        });

    } catch (error) {
        console.error('Error verifying reset token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify reset token',
            error: error.message
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
                message: 'Token and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Find valid token
        const tokenData = await passwordResetModel.findValidToken(token);

        if (!tokenData) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user password
        await authModel.updateUserPassword(tokenData.user_id, hashedPassword);

        // Mark token as used
        await passwordResetModel.markTokenAsUsed(token);

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
};

// Cleanup expired tokens (admin only)
const cleanupExpiredTokens = async (req, res) => {
    try {
        const deletedCount = await passwordResetModel.cleanupExpiredTokens();

        res.status(200).json({
            success: true,
            message: 'Expired tokens cleaned up successfully',
            data: {
                deletedTokens: deletedCount
            }
        });

    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired tokens',
            error: error.message
        });
    }
};

module.exports = {
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
    cleanupExpiredTokens
};

