const sliderService = require('../services/sliderService');
const { uploadImage, validateImage } = require('../utils/bunnyUpload');

// Desktop Slider Controllers
const addDesktopSlider = async (req, res) => {
    try {
        const { imgUrl } = req.body;

        if (!imgUrl) {
            return res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
        }

        const result = await sliderService.createDesktopSlider({ imgUrl });

        res.status(201).json({
            success: true,
            message: result.message,
            data: {
                sliderID: result.data.sliderID
            }
        });

    } catch (error) {
        console.error('Error creating desktop slider:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create desktop slider',
            error: error.message
        });
    }
};

const getAllDesktopSliders = async (req, res) => {
    try {
        const result = await sliderService.getAllDesktopSliders();

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });

    } catch (error) {
        console.error('Error fetching desktop sliders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch desktop sliders',
            error: error.message
        });
    }
};

const getDesktopSliderById = async (req, res) => {
    try {
        const { sliderID } = req.params;

        if (!sliderID || isNaN(sliderID)) {
            return res.status(400).json({
                success: false,
                message: 'Valid slider ID is required'
            });
        }

        const result = await sliderService.getDesktopSliderById(parseInt(sliderID));

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });

    } catch (error) {
        console.error('Error fetching desktop slider:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to fetch desktop slider',
            error: error.message
        });
    }
};

const updateDesktopSlider = async (req, res) => {
    try {
        const { sliderID } = req.params;
        const { imgUrl } = req.body;

        if (!sliderID || isNaN(sliderID)) {
            return res.status(400).json({
                success: false,
                message: 'Valid slider ID is required'
            });
        }

        if (!imgUrl) {
            return res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
        }

        const result = await sliderService.updateDesktopSlider(parseInt(sliderID), { imgUrl });

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Error updating desktop slider:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to update desktop slider',
            error: error.message
        });
    }
};

const deleteDesktopSlider = async (req, res) => {
    try {
        const { sliderID } = req.params;

        if (!sliderID || isNaN(sliderID)) {
            return res.status(400).json({
                success: false,
                message: 'Valid slider ID is required'
            });
        }

        const result = await sliderService.deleteDesktopSlider(parseInt(sliderID));

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Error deleting desktop slider:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to delete desktop slider',
            error: error.message
        });
    }
};

// Mobile Slider Controllers
const addMobileSlider = async (req, res) => {
    try {
        const { imgUrl } = req.body;

        if (!imgUrl) {
            return res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
        }

        const result = await sliderService.createMobileSlider({ imgUrl });

        res.status(201).json({
            success: true,
            message: result.message,
            data: {
                sliderID: result.data.sliderID
            }
        });

    } catch (error) {
        console.error('Error creating mobile slider:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create mobile slider',
            error: error.message
        });
    }
};

const getAllMobileSliders = async (req, res) => {
    try {
        const result = await sliderService.getAllMobileSliders();

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });

    } catch (error) {
        console.error('Error fetching mobile sliders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch mobile sliders',
            error: error.message
        });
    }
};

const getMobileSliderById = async (req, res) => {
    try {
        const { sliderID } = req.params;

        if (!sliderID || isNaN(sliderID)) {
            return res.status(400).json({
                success: false,
                message: 'Valid slider ID is required'
            });
        }

        const result = await sliderService.getMobileSliderById(parseInt(sliderID));

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });

    } catch (error) {
        console.error('Error fetching mobile slider:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to fetch mobile slider',
            error: error.message
        });
    }
};

const updateMobileSlider = async (req, res) => {
    try {
        const { sliderID } = req.params;
        const { imgUrl } = req.body;

        if (!sliderID || isNaN(sliderID)) {
            return res.status(400).json({
                success: false,
                message: 'Valid slider ID is required'
            });
        }

        if (!imgUrl) {
            return res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
        }

        const result = await sliderService.updateMobileSlider(parseInt(sliderID), { imgUrl });

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Error updating mobile slider:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to update mobile slider',
            error: error.message
        });
    }
};

const deleteMobileSlider = async (req, res) => {
    try {
        const { sliderID } = req.params;

        if (!sliderID || isNaN(sliderID)) {
            return res.status(400).json({
                success: false,
                message: 'Valid slider ID is required'
            });
        }

        const result = await sliderService.deleteMobileSlider(parseInt(sliderID));

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Error deleting mobile slider:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to delete mobile slider',
            error: error.message
        });
    }
};

module.exports = {
    // Desktop slider controllers
    addDesktopSlider,
    getAllDesktopSliders,
    getDesktopSliderById,
    updateDesktopSlider,
    deleteDesktopSlider,

    // Mobile slider controllers
    addMobileSlider,
    getAllMobileSliders,
    getMobileSliderById,
    updateMobileSlider,
    deleteMobileSlider
};

// File upload: Desktop
module.exports.uploadDesktopSliderFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Image file is required' });
        }

        const validation = validateImage(req.file);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.error });
        }

        const uploaded = await uploadImage(req.file, 'sliders/desktop');
        if (!uploaded.success) {
            return res.status(500).json({ success: false, message: uploaded.error || 'Upload failed' });
        }

        const created = await sliderService.createDesktopSlider({ imgUrl: uploaded.url });
        return res.status(201).json({ success: true, message: created.message, data: { sliderID: created.data.sliderID, imgUrl: uploaded.url } });
    } catch (error) {
        console.error('Error uploading desktop slider:', error);
        return res.status(500).json({ success: false, message: 'Failed to upload desktop slider', error: error.message });
    }
};

// File upload: Mobile
module.exports.uploadMobileSliderFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Image file is required' });
        }

        const validation = validateImage(req.file);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.error });
        }

        const uploaded = await uploadImage(req.file, 'sliders/mobile');
        if (!uploaded.success) {
            return res.status(500).json({ success: false, message: uploaded.error || 'Upload failed' });
        }

        const created = await sliderService.createMobileSlider({ imgUrl: uploaded.url });
        return res.status(201).json({ success: true, message: created.message, data: { sliderID: created.data.sliderID, imgUrl: uploaded.url } });
    } catch (error) {
        console.error('Error uploading mobile slider:', error);
        return res.status(500).json({ success: false, message: 'Failed to upload mobile slider', error: error.message });
    }
};
