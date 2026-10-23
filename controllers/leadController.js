const leadModel = require('../models/leadModel');

/**
 * Public: Submit a new lead inquiry (from Floating Form or Contact Page)
 */
async function createLead(req, res) {
    try {
        let { name, phone, address, requirement, source } = req.body;

        name = (name || '').trim();
        phone = (phone || '').trim();
        address = (address || '').trim();
        requirement = (requirement || '').trim();
        source = (source || 'floating_form').trim();

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required.'
            });
        }
        if (name.length < 2 || name.length > 150) {
            return res.status(400).json({
                success: false,
                message: 'Name must be between 2 and 150 characters.'
            });
        }

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required.'
            });
        }
        // Basic phone validation (allowing digits, +, -, spaces, min 7, max 20)
        const phoneClean = phone.replace(/[\s\-\(\)]/g, '');
        if (!/^\+?[0-9]{7,15}$/.test(phoneClean)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid phone number.'
            });
        }

        if (!requirement) {
            return res.status(400).json({
                success: false,
                message: 'Requirement details are required.'
            });
        }
        if (requirement.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Please provide more details in your requirement (at least 3 characters).'
            });
        }

        const validSources = ['floating_form', 'contact_page'];
        const safeSource = validSources.includes(source) ? source : 'floating_form';

        const result = await leadModel.createLead({
            name,
            phone,
            address: address || null,
            requirement,
            source: safeSource
        });

        return res.status(201).json({
            success: true,
            message: 'Thank you! Your inquiry has been received. Our team will contact you shortly.',
            leadId: result.id
        });
    } catch (err) {
        console.error('[leadController.createLead] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit inquiry. Please try again later.'
        });
    }
}

/**
 * Admin: Get leads list with filters & pagination
 */
async function getLeads(req, res) {
    try {
        const { page, limit, status, source, search } = req.query;
        const result = await leadModel.getLeads({
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 20,
            status,
            source,
            search
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('[leadController.getLeads] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch leads.'
        });
    }
}

/**
 * Admin: Get lead stats counts
 */
async function getLeadStats(req, res) {
    try {
        const stats = await leadModel.getLeadStats();
        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error('[leadController.getLeadStats] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch lead stats.'
        });
    }
}

/**
 * Admin: Update lead status or notes
 */
async function updateLead(req, res) {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['new', 'contacted', 'in_progress', 'converted', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const updated = await leadModel.updateLead(id, { status, notes });
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found or no changes made.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lead updated successfully.'
        });
    } catch (err) {
        console.error('[leadController.updateLead] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update lead.'
        });
    }
}

/**
 * Admin: Delete lead
 */
async function deleteLead(req, res) {
    try {
        const { id } = req.params;
        const deleted = await leadModel.deleteLead(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lead deleted successfully.'
        });
    } catch (err) {
        console.error('[leadController.deleteLead] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete lead.'
        });
    }
}

module.exports = {
    createLead,
    getLeads,
    getLeadStats,
    updateLead,
    deleteLead
};
