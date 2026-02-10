const videoModel = require('../models/videoModel');

const MP4_URL_PATTERN = /^https?:\/\/.+\.mp4(\?.*)?$/i;

const validateVideoPayload = ({ videoUrl }) => {
    if (!videoUrl) {
        throw new Error('Video URL is required');
    }

    if (!MP4_URL_PATTERN.test(videoUrl)) {
        throw new Error('Invalid video URL format. Please provide a valid .mp4 URL');
    }
};

const createVideo = async (videoData) => {
    try {
        validateVideoPayload(videoData);

        const result = await videoModel.createVideo(videoData);
        return {
            success: true,
            data: result,
            message: 'Homepage video created successfully'
        };
    } catch (error) {
        throw new Error(`Homepage video creation failed: ${error.message}`);
    }
};

const getHomepageVideos = async (limit) => {
    try {
        const parsedLimit = limit ? parseInt(limit, 10) : undefined;
        const videos = await videoModel.getActiveVideos(
            Number.isNaN(parsedLimit) ? undefined : parsedLimit
        );
        return {
            success: true,
            data: videos,
            message: 'Homepage videos fetched successfully'
        };
    } catch (error) {
        throw new Error(`Failed to fetch homepage videos: ${error.message}`);
    }
};

const updateVideo = async (videoID, videoData) => {
    try {
        const existing = await videoModel.getVideoById(videoID);
        if (!existing) {
            throw new Error('Homepage video not found');
        }

        if (videoData.videoUrl !== undefined) {
            validateVideoPayload({ videoUrl: videoData.videoUrl });
        }

        const result = await videoModel.updateVideo(videoID, videoData);
        return {
            success: true,
            data: result,
            message: 'Homepage video updated successfully'
        };
    } catch (error) {
        throw new Error(`Failed to update homepage video: ${error.message}`);
    }
};

const deleteVideo = async (videoID) => {
    try {
        const existing = await videoModel.getVideoById(videoID);
        if (!existing) {
            throw new Error('Homepage video not found');
        }

        const result = await videoModel.deleteVideo(videoID);
        return {
            success: true,
            data: result,
            message: 'Homepage video deleted successfully'
        };
    } catch (error) {
        throw new Error(`Failed to delete homepage video: ${error.message}`);
    }
};

module.exports = {
    createVideo,
    getHomepageVideos,
    updateVideo,
    deleteVideo
};

