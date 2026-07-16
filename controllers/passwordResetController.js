const passwordResetModel = require('../models/passwordResetModel');
const authModel = require('../models/authModel');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ─── Helper: generate 6-digit numeric OTP ────────────────────────────────────
function generateSMSOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/password-reset/request
// Sends an SMS OTP to the user's registered mobile number.
// Still sends the email link as a fallback (existing email flow preserved).
// ─────────────────────────────────────────────────────────────────────────────
const requestPasswordReset = async (req, res) => {
    console.log('🔥 Password reset request received!');

    try {
        const { email, phoneNumber } = req.body;
        if (!email && !phoneNumber) {
            return res.status(400).json({ success: false, message: 'Email or Phone number is required' });
        }

        let user = null;
        if (phoneNumber) {
            user = await authModel.getUserByPhone(phoneNumber);
        } else {
            user = await authModel.getUserByEmail(email);
        }

        if (!user) {
            // Security: return 200 even on unknown details to not leak existence
            return res.status(200).json({
                success: true,
                message: 'If the details are registered, a password reset OTP has been sent.'
            });
        }

        const userEmail = user.emailID;
        const userPhone = user.phoneNumber;

        // Check if user has a phone number
        if (!userPhone) {
            return res.status(400).json({
                success: false,
                message: 'No mobile number is linked to this account. Please contact support.'
            });
        }

        // Invalidate any previous unused OTPs for this email
        await passwordResetModel.invalidatePreviousOTPs(userEmail);

        // Generate a fresh 6-digit SMS OTP
        const smsOtp = generateSMSOTP();

        // Generate a crypto token (needed for DB record + email link fallback)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt  = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save both the token and the OTP to the DB
        await passwordResetModel.createResetToken(user.uid, userEmail, resetToken, expiresAt, smsOtp);

        console.log(`✅ Reset record saved | OTP: ${smsOtp} | Expires: ${expiresAt}`);

        // ── Send OTP via SMS ──────────────────────────────────────────────────
        // DLT Template (ID: 1777178411690264265):
        // "Cursive Letters LY: Your OTP for password reset is [XXXX].
        //  This OTP is valid for [10] minutes. Do not share this OTP with anyone."
        try {
            const smsResult = await smsService.sendPasswordResetOTPSMS(userPhone, smsOtp);
            if (smsResult.success) {
                console.log('📱 Password reset OTP SMS sent successfully to', userPhone);
            } else {
                console.warn('⚠️  Password reset OTP SMS failed:', smsResult.error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send OTP SMS. Please try again.'
                });
            }
        } catch (smsErr) {
            console.error('❌ SMS send error:', smsErr.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP SMS. Please try again.'
            });
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Send email link as fallback (existing behaviour, non-blocking) ───
        try {
            emailService.sendPasswordResetEmail(userEmail, resetToken, user.name || user.username)
                .then(r => r.success
                    ? console.log('📧 Reset email also sent (fallback)')
                    : console.warn('⚠️  Reset email fallback failed:', r.error)
                )
                .catch(e => console.warn('⚠️  Reset email fallback error:', e.message));
        } catch (_) { /* non-fatal */ }
        // ─────────────────────────────────────────────────────────────────────

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your registered mobile number. It is valid for 10 minutes.',
            email: userEmail, // Return email to frontend to complete the reset process
            maskedPhone: userPhone
                ? `+91 xxxxxx${String(userPhone).slice(-4)}`
                : null
        });

    } catch (error) {
        console.error('Error requesting password reset:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process request. Please try again.',
            error: error.message
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/password-reset/verify-otp
// Body: { email, phoneNumber, otp, newPassword }
// Verifies the SMS OTP and resets the password in one step.
// ─────────────────────────────────────────────────────────────────────────────
const verifyOTPAndResetPassword = async (req, res) => {
    try {
        const { email, phoneNumber, otp, newPassword } = req.body;

        if (!otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'otp and newPassword are required'
            });
        }

        let userEmail = email;
        if (!userEmail) {
            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'email or phoneNumber is required'
                });
            }
            const user = await authModel.getUserByPhone(phoneNumber);
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'User not found'
                });
            }
            userEmail = user.emailID;
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'OTP must be exactly 6 digits'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Verify OTP
        const record = await passwordResetModel.verifyOTP(userEmail, otp);
        if (!record) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP. Please request a new one.'
            });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await authModel.updateUserPassword(record.user_id, hashedPassword);

        // Mark OTP as used so it can't be reused
        await passwordResetModel.markOTPUsed(record.id);

        console.log(`✅ Password reset via OTP for user ${record.user_id}`);

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now log in with your new password.'
        });

    } catch (error) {
        console.error('Error resetting password with OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.',
            error: error.message
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/password-reset/verify/:token
// Kept for backward compatibility with existing email links.
// ─────────────────────────────────────────────────────────────────────────────
const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Reset token is required' });
        }

        const tokenData = await passwordResetModel.findValidToken(token);
        if (!tokenData) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        return res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: { email: tokenData.email, user_id: tokenData.user_id }
        });
    } catch (error) {
        console.error('Error verifying reset token:', error);
        return res.status(500).json({ success: false, message: 'Failed to verify reset token', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/password-reset/reset
// Kept for backward compatibility with email link flow.
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        const tokenData = await passwordResetModel.findValidToken(token);
        if (!tokenData) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await authModel.updateUserPassword(tokenData.user_id, hashedPassword);
        await passwordResetModel.markTokenAsUsed(token);

        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message });
    }
};

// Admin: cleanup
const cleanupExpiredTokens = async (req, res) => {
    try {
        const deletedCount = await passwordResetModel.cleanupExpiredTokens();
        return res.status(200).json({
            success: true,
            message: 'Expired tokens cleaned up successfully',
            data: { deletedTokens: deletedCount }
        });
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
        return res.status(500).json({ success: false, message: 'Failed to cleanup expired tokens', error: error.message });
    }
};

module.exports = {
    requestPasswordReset,
    verifyOTPAndResetPassword,
    verifyResetToken,
    resetPassword,
    cleanupExpiredTokens
};
