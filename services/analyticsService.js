const db = require('../utils/dbconnect');

// Get comprehensive dashboard analytics
const getDashboardAnalytics = async () => {
    try {
        // Get total products count
        const [productsResult] = await db.execute('SELECT COUNT(*) as total FROM products');
        const totalProducts = productsResult[0].total;

        // Get active products count
        const [activeProductsResult] = await db.execute('SELECT COUNT(*) as total FROM products WHERE status = "active"');
        const activeProducts = activeProductsResult[0].total;

        // Get synced products count (assuming syncStatus column exists)
        const [syncedProductsResult] = await db.execute('SELECT COUNT(*) as total FROM products WHERE syncStatus = "synced"');
        const syncedProducts = syncedProductsResult[0].total;

        // Get total users count
        const [usersResult] = await db.execute('SELECT COUNT(*) as total FROM users');
        const totalUsers = usersResult[0].total;

        // Get active users count
        const [activeUsersResult] = await db.execute('SELECT COUNT(*) as total FROM users WHERE status = "active"');
        const activeUsers = activeUsersResult[0].total;

        // Get admin users count
        const [adminUsersResult] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role = "admin"');
        const adminUsers = adminUsersResult[0].total;

        // Get regular users count
        const [regularUsersResult] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role = "user"');
        const regularUsers = regularUsersResult[0].total;

        // Get recent products (last 7 days)
        const [recentProductsResult] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM products 
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        const recentProducts = recentProductsResult[0].total;

        // Get recent users (last 7 days)
        const [recentUsersResult] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM users 
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        const recentUsers = recentUsersResult[0].total;

        // Get products by category
        const [categoryStats] = await db.execute(`
            SELECT 
                c.categoryName,
                COUNT(p.productID) as productCount
            FROM categories c
            LEFT JOIN products p ON c.categoryID = p.categoryID
            GROUP BY c.categoryID, c.categoryName
            ORDER BY productCount DESC
            LIMIT 5
        `);

        // Get products by status
        const [statusStats] = await db.execute(`
            SELECT 
                status,
                COUNT(*) as count
            FROM products
            GROUP BY status
        `);

        // Get users by role
        const [roleStats] = await db.execute(`
            SELECT 
                role,
                COUNT(*) as count
            FROM users
            GROUP BY role
        `);

        // Get users by status
        const [userStatusStats] = await db.execute(`
            SELECT 
                status,
                COUNT(*) as count
            FROM users
            GROUP BY status
        `);

        // Calculate growth rates (comparing last 7 days to previous 7 days)
        const [productsGrowthResult] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM products WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as current_week,
                (SELECT COUNT(*) FROM products WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)) as previous_week
        `);

        const productsGrowth = productsGrowthResult[0];
        const productGrowthRate = productsGrowth.previous_week > 0
            ? ((productsGrowth.current_week - productsGrowth.previous_week) / productsGrowth.previous_week * 100).toFixed(1)
            : 0;

        const [usersGrowthResult] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as current_week,
                (SELECT COUNT(*) FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)) as previous_week
        `);

        const usersGrowth = usersGrowthResult[0];
        const userGrowthRate = usersGrowth.previous_week > 0
            ? ((usersGrowth.current_week - usersGrowth.previous_week) / usersGrowth.previous_week * 100).toFixed(1)
            : 0;

        return {
            overview: {
                totalProducts,
                activeProducts,
                syncedProducts,
                totalUsers,
                activeUsers,
                adminUsers,
                regularUsers,
                recentProducts,
                recentUsers
            },
            growth: {
                productGrowthRate: parseFloat(productGrowthRate),
                userGrowthRate: parseFloat(userGrowthRate)
            },
            breakdown: {
                productsByCategory: categoryStats[0],
                productsByStatus: statusStats[0],
                usersByRole: roleStats[0],
                usersByStatus: userStatusStats[0]
            },
            // Dummy data for orders (as requested)
            orders: {
                totalOrders: 89,
                pendingOrders: 12,
                completedOrders: 65,
                cancelledOrders: 12
            }
        };
    } catch (error) {
        console.error('Error in getDashboardAnalytics service:', error);
        throw error;
    }
};

// Get product-specific analytics
const getProductAnalytics = async () => {
    try {
        // Get products by price range
        const [priceRanges] = await db.execute(`
            SELECT 
                CASE 
                    WHEN productPrice < 1000 THEN 'Under ₹1,000'
                    WHEN productPrice < 5000 THEN '₹1,000 - ₹5,000'
                    WHEN productPrice < 10000 THEN '₹5,000 - ₹10,000'
                    WHEN productPrice < 50000 THEN '₹10,000 - ₹50,000'
                    ELSE 'Above ₹50,000'
                END as priceRange,
                COUNT(*) as count
            FROM products
            GROUP BY priceRange
            ORDER BY MIN(productPrice)
        `);

        // Get top categories by product count
        const [topCategories] = await db.execute(`
            SELECT 
                c.categoryName,
                COUNT(p.productID) as productCount,
                AVG(p.productPrice) as avgPrice
            FROM categories c
            LEFT JOIN products p ON c.categoryID = p.categoryID
            GROUP BY c.categoryID, c.categoryName
            ORDER BY productCount DESC
            LIMIT 10
        `);

        // Get inventory status
        const [inventoryStatus] = await db.execute(`
            SELECT 
                CASE 
                    WHEN inventory = 0 THEN 'Out of Stock'
                    WHEN inventory < 10 THEN 'Low Stock'
                    WHEN inventory < 50 THEN 'Medium Stock'
                    ELSE 'High Stock'
                END as stockLevel,
                COUNT(*) as count
            FROM products
            GROUP BY stockLevel
        `);

        return {
            priceRanges: priceRanges[0],
            topCategories: topCategories[0],
            inventoryStatus: inventoryStatus[0]
        };
    } catch (error) {
        console.error('Error in getProductAnalytics service:', error);
        throw error;
    }
};

// Get user-specific analytics
const getUserAnalytics = async () => {
    try {
        // Get user registration trends (last 30 days)
        const [registrationTrends] = await db.execute(`
            SELECT 
                DATE(createdAt) as date,
                COUNT(*) as registrations
            FROM users
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(createdAt)
            ORDER BY date DESC
        `);

        // Get users by creation month
        const [monthlyRegistrations] = await db.execute(`
            SELECT 
                DATE_FORMAT(createdAt, '%Y-%m') as month,
                COUNT(*) as count
            FROM users
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
            ORDER BY month DESC
        `);

        // Get user activity (users with recent login)
        const [activeUsersResult] = await db.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN lastLogin >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_last_week,
                COUNT(CASE WHEN lastLogin >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_last_month
            FROM users
            WHERE status = 'active'
        `);

        return {
            registrationTrends: registrationTrends[0],
            monthlyRegistrations: monthlyRegistrations[0],
            activity: activeUsersResult[0]
        };
    } catch (error) {
        console.error('Error in getUserAnalytics service:', error);
        throw error;
    }
};

module.exports = {
    getDashboardAnalytics,
    getProductAnalytics,
    getUserAnalytics
};

