const analyticsService = require('../services/analyticsService');

// Get dashboard analytics
const getDashboardAnalytics = async (req, res) => {
    try {
        const analytics = await analyticsService.getDashboardAnalytics();

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Error getting dashboard analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics data',
            error: error.message
        });
    }
};

// Get product analytics
const getProductAnalytics = async (req, res) => {
    try {
        const analytics = await analyticsService.getProductAnalytics();

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Error getting product analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product analytics',
            error: error.message
        });
    }
};

// Get user analytics
const getUserAnalytics = async (req, res) => {
    try {
        const analytics = await analyticsService.getUserAnalytics();

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Error getting user analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user analytics',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardAnalytics,
    getProductAnalytics,
    getUserAnalytics
};

