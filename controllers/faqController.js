const faqModel = require('../models/faqModel');

// Get all FAQs (public)
const getAllFAQs = async (req, res) => {
    try {
        const faqs = await faqModel.getAllFAQs();
        res.status(200).json({
            success: true,
            data: faqs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch FAQs',
            error: error.message
        });
    }
};

// Get FAQ by ID (admin)
const getFAQById = async (req, res) => {
    try {
        const { id } = req.params;
        const faq = await faqModel.getFAQById(id);

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: 'FAQ not found'
            });
        }

        res.status(200).json({
            success: true,
            data: faq
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch FAQ',
            error: error.message
        });
    }
};

// Create new FAQ (admin)
const createFAQ = async (req, res) => {
    try {
        const { question, answer, display_order, is_active } = req.body;

        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                message: 'Question and answer are required'
            });
        }

        const faqId = await faqModel.createFAQ({
            question,
            answer,
            display_order: display_order || 0,
            is_active: is_active !== undefined ? is_active : 1
        });

        res.status(201).json({
            success: true,
            message: 'FAQ created successfully',
            data: { id: faqId }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create FAQ',
            error: error.message
        });
    }
};

// Update FAQ (admin)
const updateFAQ = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updated = await faqModel.updateFAQ(id, updateData);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'FAQ not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'FAQ updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update FAQ',
            error: error.message
        });
    }
};

// Delete FAQ (admin)
const deleteFAQ = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await faqModel.deleteFAQ(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'FAQ not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'FAQ deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete FAQ',
            error: error.message
        });
    }
};

// Update FAQ display order (admin)
const updateFAQOrder = async (req, res) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates)) {
            return res.status(400).json({
                success: false,
                message: 'Updates must be an array'
            });
        }

        const updated = await faqModel.updateFAQOrder(updates);
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update FAQ order'
            });
        }

        res.status(200).json({
            success: true,
            message: 'FAQ order updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update FAQ order',
            error: error.message
        });
    }
};

module.exports = {
    getAllFAQs,
    getFAQById,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    updateFAQOrder
};
