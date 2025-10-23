const addressModel = require('../models/addressModel');

// Create address
const createAddress = async (req, res) => {
    try {
        const userID = req.user?.uid;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const {
            name,
            phone,
            addressLine1,
            addressLine2 = '',
            city,
            state,
            pincode,
            isDefault = false
        } = req.body;

        // Validate required fields
        if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const addressData = {
            userID,
            name,
            phone,
            addressLine1,
            addressLine2,
            city,
            state,
            pincode,
            isDefault
        };

        const address = await addressModel.createAddress(addressData);

        res.status(201).json({
            success: true,
            message: 'Address created successfully',
            data: address
        });
    } catch (error) {
        console.error('Error creating address:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating address',
            error: error.message
        });
    }
};

// Get user addresses
const getUserAddresses = async (req, res) => {
    try {
        const userID = req.user?.uid;
        if (!userID) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const addresses = await addressModel.getAddressesByUserId(userID);

        res.status(200).json({
            success: true,
            data: addresses
        });
    } catch (error) {
        console.error('Error getting addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting addresses',
            error: error.message
        });
    }
};

// Get address by ID
const getAddressById = async (req, res) => {
    try {
        const { addressID } = req.params;
        const userID = req.user?.uid;

        if (!userID) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const address = await addressModel.getAddressById(addressID);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Check if address belongs to user
        if (address.userID !== userID) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.status(200).json({
            success: true,
            data: address
        });
    } catch (error) {
        console.error('Error getting address:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting address',
            error: error.message
        });
    }
};

// Update address
const updateAddress = async (req, res) => {
    try {
        const { addressID } = req.params;
        const userID = req.user?.uid;

        if (!userID) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Check if address exists and belongs to user
        const existingAddress = await addressModel.getAddressById(addressID);
        if (!existingAddress) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        if (existingAddress.userID !== userID) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updated = await addressModel.updateAddress(addressID, req.body);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No changes made or address not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Address updated successfully'
        });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating address',
            error: error.message
        });
    }
};

// Delete address
const deleteAddress = async (req, res) => {
    try {
        const { addressID } = req.params;
        const userID = req.user?.uid;

        if (!userID) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Check if address exists and belongs to user
        const existingAddress = await addressModel.getAddressById(addressID);
        if (!existingAddress) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        if (existingAddress.userID !== userID) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const deleted = await addressModel.deleteAddress(addressID);

        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'Address not found or could not be deleted'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Address deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting address',
            error: error.message
        });
    }
};

// Set default address
const setDefaultAddress = async (req, res) => {
    try {
        const { addressID } = req.params;
        const userID = req.user?.uid;

        if (!userID) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Check if address exists and belongs to user
        const existingAddress = await addressModel.getAddressById(addressID);
        if (!existingAddress) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        if (existingAddress.userID !== userID) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updated = await addressModel.setDefaultAddress(addressID, userID);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'Could not set address as default'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Default address updated successfully'
        });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting default address',
            error: error.message
        });
    }
};

module.exports = {
    createAddress,
    getUserAddresses,
    getAddressById,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
