const videoService = require('../services/videoService');

const addHomepageVideo = async (req, res) => {
    try {
        const { title, videoUrl, isActive, sortOrder } = req.body;

        const result = await videoService.createVideo({
            title,
            videoUrl,
            isActive,
            sortOrder
        });

        res.status(201).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error('Error creating homepage video:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getHomepageVideos = async (req, res) => {
    try {
        const { limit } = req.query;
        const result = await videoService.getHomepageVideos(limit);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error('Error fetching homepage videos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch homepage videos',
            error: error.message
        });
    }
};

const updateHomepageVideo = async (req, res) => {
    try {
        const { videoID } = req.params;
        if (!videoID || isNaN(videoID)) {
            return res.status(400).json({
                success: false,
                message: 'Valid video ID is required'
            });
        }

        const result = await videoService.updateVideo(parseInt(videoID, 10), req.body);

        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error updating homepage video:', error);
        const status = error.message.includes('not found') ? 404 : 500;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

const deleteHomepageVideo = async (req, res) => {
    try {
        const { videoID } = req.params;
        if (!videoID || isNaN(videoID)) {
            return res.status(400).json({
                success: false,
                message: 'Valid video ID is required'
            });
        }

        const result = await videoService.deleteVideo(parseInt(videoID, 10));

        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error deleting homepage video:', error);
        const status = error.message.includes('not found') ? 404 : 500;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    addHomepageVideo,
    getHomepageVideos,
    updateHomepageVideo,
    deleteHomepageVideo
};

