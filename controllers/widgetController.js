const widgetModel = require('../models/widgetModel');

/**
 * Public: Get widget config and active chatbot flow
 */
async function getWidgetConfig(req, res) {
    try {
        const config = await widgetModel.getWidgetConfig();
        // Allow aggressive browser / edge caching for speed (e.g. 60s)
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
        return res.status(200).json({
            success: true,
            data: config
        });
    } catch (err) {
        console.error('[widgetController.getWidgetConfig] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch widget configuration.'
        });
    }
}

/**
 * Admin: Get complete widget settings & chatbot flow
 */
async function getSettings(req, res) {
    try {
        const config = await widgetModel.getWidgetConfig();
        return res.status(200).json({
            success: true,
            data: config
        });
    } catch (err) {
        console.error('[widgetController.getSettings] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch widget settings.'
        });
    }
}

/**
 * Admin: Update widget settings
 */
async function updateSettings(req, res) {
    try {
        const {
            contact_form_enabled,
            chatbot_enabled,
            contact_button_label,
            chatbot_button_label,
            chatbot_title,
            chatbot_welcome_message,
            contact_form_title,
            contact_form_subtitle,
            shake_interval_seconds
        } = req.body;

        const updated = await widgetModel.saveWidgetSettings({
            contact_form_enabled: Boolean(contact_form_enabled),
            chatbot_enabled: Boolean(chatbot_enabled),
            contact_button_label: contact_button_label || 'Quick Inquiry',
            chatbot_button_label: chatbot_button_label || 'Chat with Us',
            chatbot_title: chatbot_title || 'CLY Assistant',
            chatbot_welcome_message: chatbot_welcome_message || 'Hi there! 👋 Welcome to Cursive Letters. How can we help you today?',
            contact_form_title: contact_form_title || 'Quick Inquiry',
            contact_form_subtitle: contact_form_subtitle || 'Leave your contact and requirements. We will get back to you promptly!',
            shake_interval_seconds: Number(shake_interval_seconds) || 6
        });

        return res.status(200).json({
            success: true,
            message: 'Widget settings updated successfully.',
            data: updated
        });
    } catch (err) {
        console.error('[widgetController.updateSettings] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update widget settings.'
        });
    }
}

/**
 * Admin: Update chatbot flow
 */
async function updateChatbotFlow(req, res) {
    try {
        const { flow } = req.body;
        if (!flow || !Array.isArray(flow.steps)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid flow data. Expected an object with a steps array.'
            });
        }

        const saved = await widgetModel.saveChatbotFlow(flow);
        return res.status(200).json({
            success: true,
            message: 'Chatbot flow updated successfully.',
            data: saved
        });
    } catch (err) {
        console.error('[widgetController.updateChatbotFlow] Error:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to update chatbot flow.'
        });
    }
}

module.exports = {
    getWidgetConfig,
    getSettings,
    updateSettings,
    updateChatbotFlow
};
