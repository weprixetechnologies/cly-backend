const sliderModel = require('../models/sliderModel');

// Desktop Slider Services
const createDesktopSlider = async (sliderData) => {
    try {
        // Validate required fields
        if (!sliderData.imgUrl) {
            throw new Error('Image URL is required for desktop slider');
        }

        // Validate URL format (basic validation)
        const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
        if (!urlPattern.test(sliderData.imgUrl)) {
            throw new Error('Invalid image URL format. Please provide a valid image URL ending with .jpg, .jpeg, .png, .gif, or .webp');
        }

        const result = await sliderModel.createDesktopSlider(sliderData);
        return {
            success: true,
            data: result,
            message: 'Desktop slider created successfully'
        };
    } catch (error) {
        throw new Error(`Desktop slider creation failed: ${error.message}`);
    }
};

const getAllDesktopSliders = async () => {
    try {
        const sliders = await sliderModel.getAllDesktopSliders();
        return {
            success: true,
            data: sliders,
            message: 'Desktop sliders fetched successfully'
        };
    } catch (error) {
        throw new Error(`Failed to fetch desktop sliders: ${error.message}`);
    }
};

const getDesktopSliderById = async (sliderID) => {
    try {
        const slider = await sliderModel.getDesktopSliderById(sliderID);
        if (!slider) {
            throw new Error('Desktop slider not found');
        }
        return {
            success: true,
            data: slider,
            message: 'Desktop slider fetched successfully'
        };
    } catch (error) {
        throw new Error(`Failed to fetch desktop slider: ${error.message}`);
    }
};

const updateDesktopSlider = async (sliderID, sliderData) => {
    try {
        // Check if slider exists
        const existingSlider = await sliderModel.getDesktopSliderById(sliderID);
        if (!existingSlider) {
            throw new Error('Desktop slider not found');
        }

        // Validate URL format if provided
        if (sliderData.imgUrl) {
            const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
            if (!urlPattern.test(sliderData.imgUrl)) {
                throw new Error('Invalid image URL format. Please provide a valid image URL ending with .jpg, .jpeg, .png, .gif, or .webp');
            }
        }

        const result = await sliderModel.updateDesktopSlider(sliderID, sliderData);
        return {
            success: true,
            data: result,
            message: 'Desktop slider updated successfully'
        };
    } catch (error) {
        throw new Error(`Failed to update desktop slider: ${error.message}`);
    }
};

const deleteDesktopSlider = async (sliderID) => {
    try {
        // Check if slider exists
        const existingSlider = await sliderModel.getDesktopSliderById(sliderID);
        if (!existingSlider) {
            throw new Error('Desktop slider not found');
        }

        const result = await sliderModel.deleteDesktopSlider(sliderID);
        return {
            success: true,
            data: result,
            message: 'Desktop slider deleted successfully'
        };
    } catch (error) {
        throw new Error(`Failed to delete desktop slider: ${error.message}`);
    }
};

// Mobile Slider Services
const createMobileSlider = async (sliderData) => {
    try {
        // Validate required fields
        if (!sliderData.imgUrl) {
            throw new Error('Image URL is required for mobile slider');
        }

        // Validate URL format (basic validation)
        const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
        if (!urlPattern.test(sliderData.imgUrl)) {
            throw new Error('Invalid image URL format. Please provide a valid image URL ending with .jpg, .jpeg, .png, .gif, or .webp');
        }

        const result = await sliderModel.createMobileSlider(sliderData);
        return {
            success: true,
            data: result,
            message: 'Mobile slider created successfully'
        };
    } catch (error) {
        throw new Error(`Mobile slider creation failed: ${error.message}`);
    }
};

const getAllMobileSliders = async () => {
    try {
        const sliders = await sliderModel.getAllMobileSliders();
        return {
            success: true,
            data: sliders,
            message: 'Mobile sliders fetched successfully'
        };
    } catch (error) {
        throw new Error(`Failed to fetch mobile sliders: ${error.message}`);
    }
};

const getMobileSliderById = async (sliderID) => {
    try {
        const slider = await sliderModel.getMobileSliderById(sliderID);
        if (!slider) {
            throw new Error('Mobile slider not found');
        }
        return {
            success: true,
            data: slider,
            message: 'Mobile slider fetched successfully'
        };
    } catch (error) {
        throw new Error(`Failed to fetch mobile slider: ${error.message}`);
    }
};

const updateMobileSlider = async (sliderID, sliderData) => {
    try {
        // Check if slider exists
        const existingSlider = await sliderModel.getMobileSliderById(sliderID);
        if (!existingSlider) {
            throw new Error('Mobile slider not found');
        }

        // Validate URL format if provided
        if (sliderData.imgUrl) {
            const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
            if (!urlPattern.test(sliderData.imgUrl)) {
                throw new Error('Invalid image URL format. Please provide a valid image URL ending with .jpg, .jpeg, .png, .gif, or .webp');
            }
        }

        const result = await sliderModel.updateMobileSlider(sliderID, sliderData);
        return {
            success: true,
            data: result,
            message: 'Mobile slider updated successfully'
        };
    } catch (error) {
        throw new Error(`Failed to update mobile slider: ${error.message}`);
    }
};

const deleteMobileSlider = async (sliderID) => {
    try {
        // Check if slider exists
        const existingSlider = await sliderModel.getMobileSliderById(sliderID);
        if (!existingSlider) {
            throw new Error('Mobile slider not found');
        }

        const result = await sliderModel.deleteMobileSlider(sliderID);
        return {
            success: true,
            data: result,
            message: 'Mobile slider deleted successfully'
        };
    } catch (error) {
        throw new Error(`Failed to delete mobile slider: ${error.message}`);
    }
};

module.exports = {
    // Desktop slider services
    createDesktopSlider,
    getAllDesktopSliders,
    getDesktopSliderById,
    updateDesktopSlider,
    deleteDesktopSlider,

    // Mobile slider services
    createMobileSlider,
    getAllMobileSliders,
    getMobileSliderById,
    updateMobileSlider,
    deleteMobileSlider
};
