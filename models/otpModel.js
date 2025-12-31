const db = require('../utils/dbconnect');

// Create OTP record
async function createOTP(email, otp) {
    try {
        console.log('💾 OTP Model - createOTP called');
        console.log('💾 Email:', email);
        console.log('💾 OTP:', otp);

        // Delete any existing OTP for this email first
        console.log('💾 Deleting existing OTPs for email...');
        await db.execute(
            'DELETE FROM signup_otps WHERE email = ?',
            [email]
        );

        console.log('💾 Inserting new OTP into database...');
        // Ensure OTP is stored as string
        const otpString = String(otp).trim();
        console.log('💾 OTP to store (as string):', otpString);

        // Insert OTP (expiresAt is nullable, so we can pass NULL)
        const [result] = await db.execute(
            'INSERT INTO signup_otps (email, otp, expiresAt, createdAt) VALUES (?, ?, NULL, NOW())',
            [email, otpString]
        );
        console.log('✅ OTP inserted successfully');
        console.log('💾 Insert result:', { insertId: result.insertId, affectedRows: result.affectedRows });

        return true;
    } catch (error) {
        console.error('❌ Error creating OTP:', error.message);
        console.error('❌ Error stack:', error.stack);
        throw new Error(`Error creating OTP: ${error.message}`);
    }
}

// Get OTP by email
async function getOTPByEmail(email) {
    try {
        console.log('💾 OTP Model - getOTPByEmail called');
        console.log('💾 Email:', email);

        // Get the OTP record
        const [rows] = await db.execute(
            'SELECT * FROM signup_otps WHERE email = ? ORDER BY createdAt DESC LIMIT 1',
            [email]
        );

        console.log('💾 Query result:', rows.length > 0 ? 'Found OTP record' : 'No OTP record found');

        if (rows.length === 0) {
            console.log('💾 No OTP record found for email');
            return null;
        }

        const otpRecord = rows[0];
        console.log('💾 OTP record found:', {
            id: otpRecord.id,
            email: otpRecord.email,
            otp: otpRecord.otp ? '***' : 'missing',
            createdAt: otpRecord.createdAt
        });

        return otpRecord;
    } catch (error) {
        console.error('❌ Error getting OTP:', error.message);
        console.error('❌ Error stack:', error.stack);
        throw new Error(`Error getting OTP: ${error.message}`);
    }
}

// Verify OTP (with option to delete or keep)
async function verifyOTP(email, otp, deleteAfterVerification = false) {
    try {
        console.log('💾 OTP Model - verifyOTP called');
        console.log('💾 Email:', email);
        console.log('💾 OTP:', otp ? '***' : 'missing');
        console.log('💾 Delete after verification:', deleteAfterVerification);

        console.log('💾 Getting OTP from database...');
        const otpRecord = await getOTPByEmail(email);
        console.log('💾 OTP record found:', otpRecord ? 'Yes' : 'No');

        if (!otpRecord) {
            console.error('❌ OTP not found for email:', email);
            return { valid: false, message: 'OTP not found' };
        }

        console.log('💾 Comparing OTPs...');
        // Ensure both are strings for comparison
        const storedOTP = String(otpRecord.otp).trim();
        const providedOTP = String(otp).trim();

        console.log('💾 Stored OTP (length):', storedOTP.length);
        console.log('💾 Provided OTP (length):', providedOTP.length);

        if (storedOTP !== providedOTP) {
            console.error('❌ OTP mismatch. Expected:', storedOTP, 'Received:', providedOTP);
            return { valid: false, message: 'Invalid OTP' };
        }

        console.log('✅ OTP matches');

        // Only delete if explicitly requested (during registration)
        if (deleteAfterVerification) {
            console.log('💾 Deleting OTP from database after verification...');
            await db.execute(
                'DELETE FROM signup_otps WHERE email = ?',
                [email]
            );
            console.log('✅ OTP deleted from database');
        } else {
            console.log('💾 OTP verified but kept in database (will be deleted during registration)');
        }

        return { valid: true, message: 'OTP verified successfully' };
    } catch (error) {
        console.error('❌ Error verifying OTP:', error.message);
        console.error('❌ Error stack:', error.stack);
        throw new Error(`Error verifying OTP: ${error.message}`);
    }
}

// Delete OTP by email
async function deleteOTP(email) {
    try {
        await db.execute(
            'DELETE FROM signup_otps WHERE email = ?',
            [email]
        );
        return true;
    } catch (error) {
        throw new Error(`Error deleting OTP: ${error.message}`);
    }
}

// Clean up old OTPs (optional cleanup function - no expiry check)
async function cleanupExpiredOTPs() {
    try {
        // This function is kept for compatibility but no longer checks expiry
        // OTPs are now deleted after successful verification or when new OTP is created for same email
        console.log('💾 Cleanup function called (no expiry check - OTPs don\'t expire)');
        return 0;
    } catch (error) {
        throw new Error(`Error cleaning up OTPs: ${error.message}`);
    }
}

module.exports = {
    createOTP,
    getOTPByEmail,
    verifyOTP,
    deleteOTP,
    cleanupExpiredOTPs
};

