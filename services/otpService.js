const otpModel = require('../models/otpModel');
const emailService = require('./emailService');
const authModel = require('../models/authModel');
const smsService = require('./smsService');

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP to phone via SMS (primary) and email (fallback)
async function sendOTP(email, userName, phoneNumber) {
    try {
        console.log('🔐 OTP Service - sendOTP called');
        console.log('🔐 Email:', email, '| Phone:', phoneNumber || 'none');

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        // Check if email already exists
        const emailExists = await authModel.checkEmailExists(email);
        if (emailExists) throw new Error('Email already registered');

        // Generate OTP
        const otp = generateOTP();
        console.log('🔐 Generated OTP:', otp);

        // Store OTP in database
        await otpModel.createOTP(email, otp);

        // Verify stored
        const db = require('../utils/dbconnect');
        const [verifyRows] = await db.execute(
            'SELECT * FROM signup_otps WHERE email = ? ORDER BY createdAt DESC LIMIT 1',
            [email]
        );
        if (verifyRows.length === 0) throw new Error('Failed to store OTP in database. Please try again.');
        console.log('✅ OTP stored in DB (ID:', verifyRows[0].id + ')');

        // ── Primary: Send OTP via SMS to phone ─────────────────────────────
        if (phoneNumber) {
            try {
                const smsResult = await smsService.sendSignupOTPSMS(phoneNumber, otp, 10);
                if (smsResult.success) {
                    console.log('📱 Signup OTP SMS sent successfully to', phoneNumber);
                } else {
                    console.warn('⚠️  Signup OTP SMS failed:', smsResult.error);
                    // Still continue — email fallback below
                }
            } catch (smsErr) {
                console.warn('⚠️  Signup OTP SMS error (non-fatal):', smsErr.message);
            }
        }
        // ───────────────────────────────────────────────────────────

        // ── Fallback: Send OTP via email (non-blocking) ───────────────────
        emailService.sendOTPEmail(email, otp, userName)
            .then(r => r.success
                ? console.log('📧 OTP email also sent (fallback)')
                : console.warn('⚠️  OTP email fallback failed:', r.error)
            )
            .catch(e => console.warn('⚠️  OTP email fallback error:', e.message));
        // ───────────────────────────────────────────────────────────

        return {
            success: true,
            message: phoneNumber
                ? 'OTP sent to your registered mobile number'
                : 'OTP sent to your email'
        };
    } catch (error) {
        console.error('❌ OTP Service error:', error.message);
        throw new Error(error.message);
    }
}

// Verify OTP
async function verifyOTP(email, otp) {
    try {
        console.log('🔐 OTP Service - verifyOTP called');
        console.log('🔐 Email:', email);
        console.log('🔐 OTP:', otp ? '***' : 'missing');

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.error('❌ Invalid email format:', email);
            throw new Error('Invalid email format');
        }

        // Validate OTP format
        if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            console.error('❌ Invalid OTP format:', otp);
            throw new Error('Invalid OTP format. OTP must be 6 digits');
        }

        console.log('🔐 Verifying OTP in database...');
        // Verify OTP
        // Don't delete OTP yet - it will be deleted during registration
        const result = await otpModel.verifyOTP(email, otp, false);
        console.log('🔐 OTP Model result:', result);

        if (!result.valid) {
            console.error('❌ OTP verification failed:', result.message);
            return {
                success: false,
                message: result.message
            };
        }

        console.log('✅ OTP verified successfully');
        return {
            success: true,
            message: 'OTP verified successfully'
        };
    } catch (error) {
        console.error('❌ OTP Service verifyOTP error:', error.message);
        console.error('❌ Error stack:', error.stack);
        throw new Error(error.message);
    }
}

// Cleanup expired OTPs (can be called periodically)
async function cleanupExpiredOTPs() {
    try {
        const deletedCount = await otpModel.cleanupExpiredOTPs();
        return {
            success: true,
            deletedCount
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = {
    sendOTP,
    verifyOTP,
    cleanupExpiredOTPs
};

