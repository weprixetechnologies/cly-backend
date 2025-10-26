const jwt = require('jsonwebtoken')

const verifyUserAccessToken = (req, res, next) => {
    try {
        // 1️⃣ Get token from cookies (or Authorization header)
        const token =
            req.headers?.authorization?.split(" ")[1]

        console.log('[UserAuth] Access Token:', token ? 'Present' : 'Missing');
        console.log('[UserAuth] Request URL:', req.originalUrl);
        console.log('[UserAuth] Request params:', req.params);


        if (!token) {
            console.log('[UserAuth] No token found, returning 401');
            return res.status(401).json({
                success: false,
                message: "Access token missing. Please login."
            });
        }

        // 2️⃣ Verify token
        const jwtSecret = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-in-production-2024';
        const decoded = jwt.verify(token, jwtSecret);
        console.log('[UserAuth] Token verified successfully for user:', decoded.uid || decoded.id);

        // 3️⃣ Check expiry manually (optional, jwt.verify already does it)
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.log('[UserAuth] Token expired, returning 401');
            return res.status(401).json({
                success: false,
                message: "Access token expired. Please refresh token."
            });
        }

        // 4️⃣ Attach user to req
        req.user = decoded; // contains id, email, role, etc.

        // 5️⃣ Move forward
        next();
    } catch (error) {
        console.log('[UserAuth] Token verification failed:', error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid token",
            error: error.message
        });
    }
};

module.exports = { verifyUserAccessToken }