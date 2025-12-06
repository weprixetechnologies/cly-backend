const db = require('../utils/dbconnect');

// Check if visitor from same IP visited recently (within last minute)
async function hasRecentVisit(ip) {
    try {
        const [rows] = await db.execute(
            'SELECT visitorID FROM visitorData WHERE ip = ? AND visitedOn >= DATE_SUB(NOW(), INTERVAL 1 MINUTE) LIMIT 1',
            [ip]
        );
        return rows.length > 0;
    } catch (error) {
        // If check fails, allow the insert (fail open)
        return false;
    }
}

// Create a new visitor record
async function createVisitor(ip) {
    try {
        // Check if this IP has visited in the last minute to prevent duplicates
        const recentVisit = await hasRecentVisit(ip);
        if (recentVisit) {
            // Return a success response but don't create duplicate entry
            return {
                visitorID: null,
                affectedRows: 0,
                duplicate: true
            };
        }

        const [result] = await db.execute(
            'INSERT INTO visitorData (visitedOn, ip) VALUES (NOW(), ?)',
            [ip]
        );

        return {
            visitorID: result.insertId,
            affectedRows: result.affectedRows,
            duplicate: false
        };
    } catch (error) {
        throw new Error(`Error creating visitor: ${error.message}`);
    }
}

// Get all visitors with pagination
async function getAllVisitors(page = 1, limit = 50) {
    try {
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;

        const [rows] = await db.execute(
            'SELECT visitorID, visitedOn, ip FROM visitorData ORDER BY visitedOn DESC LIMIT ? OFFSET ?',
            [limitNum, offset]
        );

        // Get total count
        const [countResult] = await db.execute('SELECT COUNT(*) as total FROM visitorData');
        const total = countResult[0].total;

        return {
            visitors: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        };
    } catch (error) {
        throw new Error(`Error fetching visitors: ${error.message}`);
    }
}

// Get visitor statistics
async function getVisitorStats() {
    try {
        // Today's visitors
        const [todayResult] = await db.execute(
            `SELECT COUNT(*) as total FROM visitorData WHERE DATE(visitedOn) = CURDATE()`
        );
        const todayVisitors = todayResult[0].total;

        // This week's visitors (last 7 days)
        const [weekResult] = await db.execute(
            `SELECT COUNT(*) as total FROM visitorData WHERE visitedOn >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );
        const weekVisitors = weekResult[0].total;

        // This month's visitors
        const [monthResult] = await db.execute(
            `SELECT COUNT(*) as total FROM visitorData WHERE MONTH(visitedOn) = MONTH(NOW()) AND YEAR(visitedOn) = YEAR(NOW())`
        );
        const monthVisitors = monthResult[0].total;

        // Total visitors
        const [totalResult] = await db.execute('SELECT COUNT(*) as total FROM visitorData');
        const totalVisitors = totalResult[0].total;

        // Unique IPs today
        const [uniqueTodayResult] = await db.execute(
            `SELECT COUNT(DISTINCT ip) as total FROM visitorData WHERE DATE(visitedOn) = CURDATE()`
        );
        const uniqueTodayIPs = uniqueTodayResult[0].total;

        // Unique IPs this week
        const [uniqueWeekResult] = await db.execute(
            `SELECT COUNT(DISTINCT ip) as total FROM visitorData WHERE visitedOn >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );
        const uniqueWeekIPs = uniqueWeekResult[0].total;

        return {
            todayVisitors,
            weekVisitors,
            monthVisitors,
            totalVisitors,
            uniqueTodayIPs,
            uniqueWeekIPs
        };
    } catch (error) {
        throw new Error(`Error fetching visitor stats: ${error.message}`);
    }
}

module.exports = {
    createVisitor,
    getAllVisitors,
    getVisitorStats
};

