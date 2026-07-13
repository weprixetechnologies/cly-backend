const settingsModel = require('../models/settingsModel');

// Default fallback values for known settings
const DEFAULTS = {
    global_discount: '12',
};

/**
 * GET /api/settings/:key  — public
 * Returns the value of a setting by key.
 */
async function getSetting(req, res) {
    try {
        const { key } = req.params;
        let value = await settingsModel.getSetting(key);

        // Fall back to known default if not set yet
        if (value === null) {
            value = DEFAULTS[key] ?? '0';
        }

        return res.status(200).json({ success: true, key, value });
    } catch (err) {
        console.error('[settingsController.getSetting]', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch setting' });
    }
}

/**
 * PUT /api/settings/:key  — admin-protected
 * Body: { value: string|number }
 */
async function updateSetting(req, res) {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined || value === null) {
            return res.status(400).json({ success: false, message: '`value` is required in the request body' });
        }

        await settingsModel.setSetting(key, value);
        return res.status(200).json({ success: true, key, value: String(value) });
    } catch (err) {
        console.error('[settingsController.updateSetting]', err);
        return res.status(500).json({ success: false, message: 'Failed to update setting' });
    }
}

module.exports = { getSetting, updateSetting };
