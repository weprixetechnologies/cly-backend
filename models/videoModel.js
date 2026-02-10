const db = require('../utils/dbconnect');

// Create a new homepage video
async function createVideo(videoData) {
    try {
        const { title, videoUrl, isActive = 1, sortOrder = 0 } = videoData;

        const [result] = await db.execute(
            `INSERT INTO homepageVideos (title, videoUrl, isActive, sortOrder) VALUES (?, ?, ?, ?)`,
            [title || null, videoUrl, isActive, sortOrder]
        );

        return {
            videoID: result.insertId,
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error creating homepage video: ${error.message}`);
    }
}

// Get active videos for homepage (optionally limited)
async function getActiveVideos(limit) {
    try {
        const sql = `
            SELECT * 
            FROM homepageVideos 
            WHERE isActive = 1 
            ORDER BY sortOrder ASC, createdAt DESC
            ${limit && Number.isInteger(limit) ? 'LIMIT ?' : ''}
        `;

        const params = [];
        if (limit && Number.isInteger(limit)) {
            params.push(limit);
        }

        const [rows] = await db.execute(sql, params);
        return rows;
    } catch (error) {
        throw new Error(`Error fetching homepage videos: ${error.message}`);
    }
}

// Get single video by ID
async function getVideoById(videoID) {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM homepageVideos WHERE videoID = ?`,
            [videoID]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching homepage video: ${error.message}`);
    }
}

// Update video
async function updateVideo(videoID, videoData) {
    try {
        const fields = [];
        const params = [];

        if (videoData.title !== undefined) {
            fields.push('title = ?');
            params.push(videoData.title || null);
        }
        if (videoData.videoUrl !== undefined) {
            fields.push('videoUrl = ?');
            params.push(videoData.videoUrl);
        }
        if (videoData.isActive !== undefined) {
            fields.push('isActive = ?');
            params.push(videoData.isActive ? 1 : 0);
        }
        if (videoData.sortOrder !== undefined) {
            fields.push('sortOrder = ?');
            params.push(videoData.sortOrder);
        }

        if (fields.length === 0) {
            return { affectedRows: 0, changedRows: 0 };
        }

        params.push(videoID);

        const [result] = await db.execute(
            `UPDATE homepageVideos SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE videoID = ?`,
            params
        );

        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        throw new Error(`Error updating homepage video: ${error.message}`);
    }
}

// Delete video
async function deleteVideo(videoID) {
    try {
        const [result] = await db.execute(
            `DELETE FROM homepageVideos WHERE videoID = ?`,
            [videoID]
        );
        return {
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error deleting homepage video: ${error.message}`);
    }
}

module.exports = {
    createVideo,
    getActiveVideos,
    getVideoById,
    updateVideo,
    deleteVideo
};

