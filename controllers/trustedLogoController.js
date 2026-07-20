const trustedLogoModel = require('../models/trustedLogoModel');

// Create a new trusted logo
const createLogo = async (req, res) => {
    try {
        const { name, logoUrl, isActive, sortOrder } = req.body;

        if (!logoUrl) {
            return res.status(400).json({
                success: false,
                message: 'Logo URL is required'
            });
        }

        const result = await trustedLogoModel.createLogo({
            name,
            logoUrl,
            isActive: isActive !== undefined ? isActive : 1,
            sortOrder: sortOrder !== undefined ? sortOrder : 0
        });

        res.status(201).json({
            success: true,
            message: 'Trusted logo created successfully',
            data: result
        });
    } catch (error) {
        console.error('Error creating trusted logo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create trusted logo',
            error: error.message
        });
    }
};

// Get active logos (public)
const getActiveLogos = async (req, res) => {
    try {
        const logos = await trustedLogoModel.getActiveLogos();
        res.status(200).json({
            success: true,
            data: logos
        });
    } catch (error) {
        console.error('Error fetching active trusted logos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trusted logos',
            error: error.message
        });
    }
};

// Get all logos (admin)
const getAllLogos = async (req, res) => {
    try {
        const logos = await trustedLogoModel.getAllLogos();
        res.status(200).json({
            success: true,
            data: logos
        });
    } catch (error) {
        console.error('Error fetching all trusted logos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trusted logos',
            error: error.message
        });
    }
};

// Update trusted logo
const updateLogo = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, logoUrl, isActive, sortOrder } = req.body;

        const existing = await trustedLogoModel.getLogoById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Trusted logo not found'
            });
        }

        const result = await trustedLogoModel.updateLogo(id, {
            name,
            logoUrl,
            isActive,
            sortOrder
        });

        res.status(200).json({
            success: true,
            message: 'Trusted logo updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating trusted logo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update trusted logo',
            error: error.message
        });
    }
};

// Delete trusted logo
const deleteLogo = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await trustedLogoModel.getLogoById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Trusted logo not found'
            });
        }

        const result = await trustedLogoModel.deleteLogo(id);

        res.status(200).json({
            success: true,
            message: 'Trusted logo deleted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error deleting trusted logo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete trusted logo',
            error: error.message
        });
    }
};

module.exports = {
    createLogo,
    getActiveLogos,
    getAllLogos,
    updateLogo,
    deleteLogo
};
