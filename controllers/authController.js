const authService = require('../services/authService');
const otpService = require('../services/otpService');

// Send OTP for user registration
async function sendSignupOTP(req, res) {
    try {
        console.log('📧 ========================================');
        console.log('📧 SEND SIGNUP OTP REQUEST RECEIVED');
        console.log('📧 Request body:', { emailID: req.body.emailID, name: req.body.name });

        const { emailID, name } = req.body;

        // Validate required fields
        if (!emailID) {
            console.error('❌ Email is missing in request');
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        console.log('📧 Calling otpService.sendOTP...');
        const result = await otpService.sendOTP(emailID, name || 'User');
        console.log('✅ OTP service returned:', result);

        res.status(200).json(result);

    } catch (error) {
        console.error('❌ Send OTP error:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

// Verify OTP for user registration
async function verifySignupOTP(req, res) {
    try {
        console.log('🔐 ========================================');
        console.log('🔐 VERIFY SIGNUP OTP REQUEST RECEIVED');
        console.log('🔐 Request body:', { emailID: req.body.emailID, otp: req.body.otp ? '***' : undefined });

        const { emailID, otp } = req.body;

        // Validate required fields
        if (!emailID || !otp) {
            console.error('❌ Missing required fields:', { hasEmailID: !!emailID, hasOtp: !!otp });
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        console.log('🔐 Calling otpService.verifyOTP...');
        const result = await otpService.verifyOTP(emailID, otp);
        console.log('🔐 OTP service returned:', { success: result.success, message: result.message });

        if (!result.success) {
            console.error('❌ OTP verification failed:', result.message);
            return res.status(400).json(result);
        }

        console.log('✅ OTP verified successfully');
        res.status(200).json(result);

    } catch (error) {
        console.error('❌ Verify OTP error:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

// Register admin
async function registerAdmin(req, res) {
    try {
        const { emailID, phoneNumber, name, password, gstin, device } = req.body;

        // Validate required fields
        if (!emailID || !phoneNumber || !name || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, phone number, name, and password are required'
            });
        }

        const result = await authService.registerAdmin({
            emailID,
            phoneNumber,
            name,
            password,
            gstin,
            device
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Admin registration error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

// Register user (requires OTP verification first)
async function registerUser(req, res) {
    try {
        const { emailID, phoneNumber, name, password, gstin, device, otp } = req.body;

        // Validate required fields
        if (!emailID || !phoneNumber || !name || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, phone number, name, and password are required'
            });
        }

        // Check if the request is from an admin (to skip OTP)
        const authHeader = req.headers?.authorization;
        let isAdmin = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const jwtSecret = process.env.JWT_ACCESS_SECRET || 'cly2025a';
                const decoded = jwt.verify(token, jwtSecret);
                if (decoded.role === 'admin' || decoded.role === 'manager') {
                    isAdmin = true;
                }
            } catch (err) {
                console.log('Token verification failed in registerUser, proceeding with OTP requirement');
            }
        }

        // Verify OTP before registration (if not an admin)
        if (!isAdmin) {
            if (!otp) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP is required for registration'
                });
            }

            // Verify OTP and delete it after successful verification
            const otpModel = require('../models/otpModel');
            const otpVerification = await otpModel.verifyOTP(emailID, otp, true); // true = delete after verification
            if (!otpVerification.valid) {
                return res.status(400).json({
                    success: false,
                    message: otpVerification.message || 'Invalid or expired OTP'
                });
            }
        }

        // OTP verified, proceed with registration
        const result = await authService.registerUserRole({
            emailID,
            phoneNumber,
            name,
            password,
            gstin,
            device
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('User registration error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

// Refresh access token
async function refreshToken(req, res) {
    process.stdout.write('🔥 REFRESH TOKEN ENDPOINT CALLED - NEW CODE IS RUNNING! 🔥\n');
    console.log('🔥 REFRESH TOKEN ENDPOINT CALLED - NEW CODE IS RUNNING! 🔥');
    try {
        const { refreshToken } = req.body;

        console.log('[RefreshToken] Request received:', {
            hasRefreshToken: !!refreshToken,
            tokenLength: refreshToken ? refreshToken.length : 0
        });

        if (!refreshToken) {
            console.log('[RefreshToken] No refresh token provided');
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        const result = await authService.refreshAccessToken(refreshToken);

        console.log('[RefreshToken] Success:', {
            success: result.success,
            hasNewAccessToken: !!result.accessToken,
            hasNewRefreshToken: !!result.refreshToken,
            userId: result.user?.uid
        });

        res.status(200).json(result);

    } catch (error) {
        console.error('[RefreshToken] Error:', {
            message: error.message,
            stack: error.stack
        });

        res.status(401).json({
            success: false,
            message: error.message
        });
    }
}

// Logout
async function logout(req, res) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        const result = await authService.logout(refreshToken);
        res.status(200).json(result);

    } catch (error) {
        console.error('Logout error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

// Login admin
async function loginAdmin(req, res) {


    try {
        const { emailID, password, device } = req.body;

        // Validate required fields
        if (!emailID || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await authService.loginAdmin({
            emailID,
            password,
            device
        });

        res.status(200).json(result);

    } catch (error) {
        console.error('Admin login error:', error.message);
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
}

// Login user
async function loginUser(req, res) {
    try {
        const { emailID, password, device } = req.body;

        // Validate required fields
        if (!emailID || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await authService.loginUserRole({
            emailID,
            password,
            device
        });

        res.status(200).json(result);

    } catch (error) {
        console.error('User login error:', error.message);
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
}

// Get user profile (placeholder for future implementation)
async function getProfile(req, res) {
    try {
        // This would require authentication middleware
        res.status(200).json({
            success: true,
            message: 'Profile endpoint - to be implemented with auth middleware'
        });
    } catch (error) {
        console.error('Get profile error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

module.exports = {
    sendSignupOTP,
    verifySignupOTP,
    registerAdmin,
    registerUser,
    loginAdmin,
    loginUser,
    refreshToken,
    logout,
    getProfile
};
