const authService = require('../services/authService');

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

// Register user
async function registerUser(req, res) {
    try {
        const { emailID, phoneNumber, name, password, gstin, device } = req.body;

        // Validate required fields
        if (!emailID || !phoneNumber || !name || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, phone number, name, and password are required'
            });
        }

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
    registerAdmin,
    registerUser,
    loginAdmin,
    loginUser,
    refreshToken,
    logout,
    getProfile
};
