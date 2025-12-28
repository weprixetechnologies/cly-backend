const db = require('../utils/dbconnect');

// Create OTP record
async function createOTP(email, otp, expiresAt) {
    try {
        console.log('💾 OTP Model - createOTP called');
        console.log('💾 Email:', email);
        console.log('💾 OTP:', otp);
        console.log('💾 ExpiresAt (Date object):', expiresAt);
        console.log('💾 ExpiresAt (ISO):', expiresAt.toISOString());

        // Delete any existing OTP for this email first
        console.log('💾 Deleting existing OTPs for email...');
        await db.execute(
            'DELETE FROM signup_otps WHERE email = ?',
            [email]
        );

        // Format expiresAt as MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
        // Convert Date object to MySQL DATETIME format
        const year = expiresAt.getFullYear();
        const month = String(expiresAt.getMonth() + 1).padStart(2, '0');
        const day = String(expiresAt.getDate()).padStart(2, '0');
        const hours = String(expiresAt.getHours()).padStart(2, '0');
        const minutes = String(expiresAt.getMinutes()).padStart(2, '0');
        const seconds = String(expiresAt.getSeconds()).padStart(2, '0');
        const formattedExpiresAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        console.log('💾 Formatted expiresAt (MySQL DATETIME):', formattedExpiresAt);

        console.log('💾 Inserting new OTP into database...');
        // Ensure OTP is stored as string
        const otpString = String(otp).trim();
        console.log('💾 OTP to store (as string):', otpString);

        // Insert OTP with calculated expiration time
        const [result] = await db.execute(
            'INSERT INTO signup_otps (email, otp, expiresAt, createdAt) VALUES (?, ?, ?, NOW())',
            [email, otpString, formattedExpiresAt]
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

// Get OTP by email (without expiration check - expiration checked in backend)
async function getOTPByEmail(email) {
    try {
        console.log('💾 OTP Model - getOTPByEmail called');
        console.log('💾 Email:', email);

        // Get the OTP record without expiration check (we'll check in backend)
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
            expiresAt: otpRecord.expiresAt,
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

        // Check expiration at backend level using JavaScript Date
        const expiresAt = new Date(otpRecord.expiresAt);
        const now = new Date();
        const timeDifference = expiresAt.getTime() - now.getTime();
        const minutesRemaining = Math.floor(timeDifference / (1000 * 60));
        const secondsRemaining = Math.floor(timeDifference / 1000);

        console.log('💾 Expiration check (Backend calculation):');
        console.log('  ExpiresAt (from DB):', otpRecord.expiresAt);
        console.log('  ExpiresAt (parsed Date):', expiresAt.toISOString());
        console.log('  Current time (backend):', now.toISOString());
        console.log('  Time difference (ms):', timeDifference);
        console.log('  Seconds remaining:', secondsRemaining);
        console.log('  Minutes remaining:', minutesRemaining);
        console.log('  Is expired?', timeDifference < 0);

        if (timeDifference < 0) {
            console.log('❌ OTP has expired');
            // Delete expired OTP
            await db.execute(
                'DELETE FROM signup_otps WHERE id = ?',
                [otpRecord.id]
            );
            console.log('💾 Deleted expired OTP from database');
            return { valid: false, message: 'OTP has expired' };
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

// Clean up expired OTPs
async function cleanupExpiredOTPs() {
    try {
        // Get all OTPs and check expiration in backend
        const [rows] = await db.execute('SELECT * FROM signup_otps');
        const now = new Date();
        let deletedCount = 0;

        for (const row of rows) {
            const expiresAt = new Date(row.expiresAt);
            if (expiresAt.getTime() < now.getTime()) {
                await db.execute('DELETE FROM signup_otps WHERE id = ?', [row.id]);
                deletedCount++;
            }
        }

        return deletedCount;
    } catch (error) {
        throw new Error(`Error cleaning up expired OTPs: ${error.message}`);
    }
}

module.exports = {
    createOTP,
    getOTPByEmail,
    verifyOTP,
    deleteOTP,
    cleanupExpiredOTPs
};

