const policyModel = require('../models/policyModel');

// Get all policies (admin)
const getAllPolicies = async (req, res) => {
    try {
        const policies = await policyModel.getAllPolicies();
        res.status(200).json({
            success: true,
            data: policies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get active policies (public)
const getActivePolicies = async (req, res) => {
    try {
        const policies = await policyModel.getActivePolicies();
        res.status(200).json({
            success: true,
            data: policies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get policy by type (public)
const getPolicyByType = async (req, res) => {
    try {
        const { type } = req.params;
        const policy = await policyModel.getPolicyByType(type);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        res.status(200).json({
            success: true,
            data: policy
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get policy by ID (admin)
const getPolicyById = async (req, res) => {
    try {
        const { id } = req.params;
        const policy = await policyModel.getPolicyById(id);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        res.status(200).json({
            success: true,
            data: policy
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new policy (admin)
const createPolicy = async (req, res) => {
    try {
        const { type, title, content, version } = req.body;
        const created_by = req.user?.uid || 1; // Get from auth middleware

        if (!type || !title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Type, title, and content are required'
            });
        }

        const validTypes = ['terms_conditions', 'privacy_policy', 'refund_policy'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid policy type'
            });
        }

        const policyId = await policyModel.createPolicy({
            type,
            title,
            content,
            version,
            created_by
        });

        res.status(201).json({
            success: true,
            message: 'Policy created successfully',
            data: { id: policyId }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update policy (admin)
const updatePolicy = async (req, res) => {

    try {
        const { id } = req.params;
        const updateData = req.body;
        const updated_by = req.user?.uid || '1'; // Get from auth middleware

        updateData.updated_by = updated_by;

        const updated = await policyModel.updatePolicy(id, updateData);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found or no changes made'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Policy updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Activate policy (admin)
const activatePolicy = async (req, res) => {
    try {
        const { id } = req.params;

        // First get the policy to get its type
        const policy = await policyModel.getPolicyById(id);
        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        const activated = await policyModel.activatePolicy(id, policy.type);
        if (!activated) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Policy activated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete policy (admin)
const deletePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await policyModel.deletePolicy(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Policy deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllPolicies,
    getActivePolicies,
    getPolicyByType,
    getPolicyById,
    createPolicy,
    updatePolicy,
    activatePolicy,
    deletePolicy
};
