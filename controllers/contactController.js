const contactModel = require('../models/contactModel');

// Get all contact details (admin)
const getAllContactDetails = async (req, res) => {
    try {
        const contacts = await contactModel.getAllContactDetails();
        res.status(200).json({
            success: true,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get active contact details (public)
const getActiveContactDetails = async (req, res) => {
    try {
        const contacts = await contactModel.getActiveContactDetails();
        res.status(200).json({
            success: true,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get contact details by type (public)
const getContactDetailsByType = async (req, res) => {
    try {
        const { type } = req.params;
        const contacts = await contactModel.getContactDetailsByType(type);
        res.status(200).json({
            success: true,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get contact detail by ID (admin)
const getContactDetailById = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await contactModel.getContactDetailById(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact detail not found'
            });
        }

        res.status(200).json({
            success: true,
            data: contact
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new contact detail (admin)
const createContactDetail = async (req, res) => {
    try {
        const { type, label, value, display_order } = req.body;

        if (!type || !label || !value) {
            return res.status(400).json({
                success: false,
                message: 'Type, label, and value are required'
            });
        }

        const validTypes = ['email', 'phone', 'address', 'social_media', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contact type'
            });
        }

        const contactId = await contactModel.createContactDetail({
            type,
            label,
            value,
            display_order: display_order || 0
        });

        res.status(201).json({
            success: true,
            message: 'Contact detail created successfully',
            data: { id: contactId }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update contact detail (admin)
const updateContactDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updated = await contactModel.updateContactDetail(id, updateData);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Contact detail not found or no changes made'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact detail updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update display order (admin)
const updateDisplayOrder = async (req, res) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates)) {
            return res.status(400).json({
                success: false,
                message: 'Updates must be an array'
            });
        }

        const updated = await contactModel.updateDisplayOrder(updates);
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update display order'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Display order updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete contact detail (admin)
const deleteContactDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await contactModel.deleteContactDetail(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Contact detail not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact detail deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllContactDetails,
    getActiveContactDetails,
    getContactDetailsByType,
    getContactDetailById,
    createContactDetail,
    updateContactDetail,
    updateDisplayOrder,
    deleteContactDetail
};
