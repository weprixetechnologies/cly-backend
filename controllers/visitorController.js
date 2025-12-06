const visitorModel = require('../models/visitorModel');

// Create a new visitor record
const createVisitor = async (req, res) => {
    try {
        // Get IP address from request
        const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

        const visitor = await visitorModel.createVisitor(ip);

        // If it's a duplicate visit (within 1 minute), still return success but don't create new entry
        if (visitor.duplicate) {
            return res.status(200).json({
                success: true,
                message: 'Visitor already recorded recently',
                data: {
                    duplicate: true
                }
            });
        }

        res.status(201).json({
            success: true,
            message: 'Visitor recorded successfully',
            data: {
                visitorID: visitor.visitorID
            }
        });
    } catch (error) {
        console.error('Error creating visitor:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get all visitors with pagination
const getAllVisitors = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 50;

        const result = await visitorModel.getAllVisitors(page, limit);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting visitors:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get visitor statistics
const getVisitorStats = async (req, res) => {
    try {
        const stats = await visitorModel.getVisitorStats();

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting visitor stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    createVisitor,
    getAllVisitors,
    getVisitorStats
};

