const jwt = require('jsonwebtoken')

const verifyAdminAccessToken = (req, res, next) => {
    try {
        // 1️⃣ Get token from cookies (or Authorization header)
        const token =
            req.headers?.authorization?.split(" ")[1]

        console.log('Access Token 1', token);
        console.log(req.params);


        if (!token) {
            return res.status(401).json({ message: "Access token missing. Please login." });
        }

        // 2️⃣ Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // 3️⃣ Check expiry manually (optional, jwt.verify already does it)
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            return res.status(401).json({ message: "Access token expired. Please refresh token." });
        }

        // 4️⃣ Attach user to req
        req.user = decoded; // contains id, email, role, etc.

        next();
    } catch (error) {
        return res.status(401).json({
            message: "invalid token",
            error: error.message
        });
    }
};

module.exports = { verifyAdminAccessToken }