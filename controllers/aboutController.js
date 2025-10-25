const aboutModel = require('../models/aboutModel');

// Get about us content (public)
const getAboutContent = async (req, res) => {
    try {
        const content = await aboutModel.getAboutContent();

        if (!content || !content.is_active) {
            return res.status(404).json({
                success: false,
                message: 'About us content not found'
            });
        }

        res.status(200).json({
            success: true,
            data: content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch about content',
            error: error.message
        });
    }
};

// Update about us content (admin)
const updateAboutContent = async (req, res) => {
    try {
        const { title, content, mission, vision, company_values, is_active } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        const updated = await aboutModel.updateAboutContent({
            title,
            content,
            mission: mission || '',
            vision: vision || '',
            company_values: company_values || '',
            is_active: is_active !== undefined ? is_active : 1
        });

        if (!updated) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update about content'
            });
        }

        res.status(200).json({
            success: true,
            message: 'About us content updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update about content',
            error: error.message
        });
    }
};

module.exports = {
    getAboutContent,
    updateAboutContent
};
