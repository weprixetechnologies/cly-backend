const otpModel = require('../models/otpModel');
const emailService = require('./emailService');
const authModel = require('../models/authModel');

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP to email
async function sendOTP(email, userName) {
    try {
        console.log('🔐 OTP Service - sendOTP called');
        console.log('🔐 Email:', email);
        console.log('🔐 UserName:', userName);

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.error('❌ Invalid email format:', email);
            throw new Error('Invalid email format');
        }

        // Check if email already exists in users table
        console.log('🔐 Checking if email exists in users table...');
        const emailExists = await authModel.checkEmailExists(email);
        if (emailExists) {
            console.error('❌ Email already registered:', email);
            throw new Error('Email already registered');
        }
        console.log('✅ Email is available');

        // Generate OTP
        const otp = generateOTP();
        console.log('🔐 Generated OTP:', otp);

        // Calculate expiration time in JavaScript (1 hour from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        console.log('🔐 OTP expires at (backend calculated):', expiresAt.toISOString());
        console.log('🔐 Current time (backend):', new Date().toISOString());
        console.log('🔐 Hours until expiry: 1');

        // Store OTP in database with calculated expiration time
        console.log('🔐 Storing OTP in database...');
        try {
            await otpModel.createOTP(email, otp, expiresAt);
            console.log('✅ OTP stored in database');
            
            // Verify OTP was actually stored (check database directly, not using getOTPByEmail which checks expiration)
            const db = require('../utils/dbconnect');
            const [verifyRows] = await db.execute(
                'SELECT * FROM signup_otps WHERE email = ? ORDER BY createdAt DESC LIMIT 1',
                [email]
            );
            if (verifyRows.length === 0) {
                console.error('❌ CRITICAL: OTP was not found in database after creation!');
                throw new Error('Failed to store OTP in database. Please try again.');
            }
            console.log('✅ Verified OTP exists in database (ID:', verifyRows[0].id + ')');
        } catch (dbError) {
            console.error('❌ Database error while storing OTP:', dbError.message);
            console.error('❌ Database error stack:', dbError.stack);
            throw new Error('Failed to store OTP in database. Please try again.');
        }

        // Send OTP via email
        console.log('🔐 Sending OTP via email...');
        const emailResult = await emailService.sendOTPEmail(email, otp, userName);
        console.log('🔐 Email result:', emailResult);

        if (!emailResult.success) {
            // If email fails, delete the OTP record
            console.error('❌ Email sending failed, deleting OTP from database');
            await otpModel.deleteOTP(email);
            throw new Error(emailResult.error || 'Failed to send OTP email. Please try again.');
        }

        console.log('✅ OTP sent successfully');
        return {
            success: true,
            message: 'OTP sent successfully to your email'
        };
    } catch (error) {
        console.error('❌ OTP Service error:', error.message);
        console.error('❌ Error stack:', error.stack);
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
        // Verify OTP (expiration check happens inside verifyOTP)
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

