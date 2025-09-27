const FormData = require('form-data');
const axios = require('axios');

// Bunny.net configuration
const BUNNY_CONFIG = {
    username: 'cly-images',
    password: 'b4381f39-9ab4-4c9f-989f88a76c2f-809a-4c75',
    host: 'storage.bunnycdn.com',
    port: 21,
    pullUrl: 'https://cly-pull.b-cdn.net'
};

// Upload single image to Bunny.net using HTTP API
async function uploadImage(file, folder = 'products') {
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${timestamp}_${randomString}.${fileExtension}`;
        const remotePath = `/${folder}/${fileName}`;

        // Create form data for HTTP upload
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: fileName,
            contentType: file.mimetype
        });

        // Upload via HTTP API to Bunny.net
        const uploadUrl = `https://${BUNNY_CONFIG.host}${remotePath}?AccessKey=${BUNNY_CONFIG.password}`;

        const response = await axios.put(uploadUrl, file.buffer, {
            headers: {
                'Content-Type': file.mimetype
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.status === 201 || response.status === 200) {
            // Return the public URL
            const publicUrl = `${BUNNY_CONFIG.pullUrl}${remotePath}`;

            return {
                success: true,
                url: publicUrl,
                fileName: fileName,
                originalName: file.originalname
            };
        } else {
            throw new Error(`Upload failed with status: ${response.status}`);
        }

    } catch (error) {
        console.error('Error uploading to Bunny.net:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Upload multiple images
async function uploadMultipleImages(files, folder = 'products') {
    const uploadPromises = files.map(file => uploadImage(file, folder));

    try {
        const results = await Promise.all(uploadPromises);
        return {
            success: true,
            results: results
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Delete image from Bunny.net using HTTP API
async function deleteImage(imageUrl) {
    try {
        // Extract file path from URL
        const urlParts = imageUrl.split(BUNNY_CONFIG.pullUrl);
        if (urlParts.length < 2) {
            throw new Error('Invalid image URL');
        }

        const filePath = urlParts[1];
        const deleteUrl = `https://${BUNNY_CONFIG.host}${filePath}?AccessKey=${BUNNY_CONFIG.password}`;

        const response = await axios.delete(deleteUrl);

        if (response.status === 200 || response.status === 204) {
            return {
                success: true,
                message: 'Image deleted successfully'
            };
        } else {
            throw new Error(`Delete failed with status: ${response.status}`);
        }

    } catch (error) {
        console.error('Error deleting image:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Validate image file
function validateImage(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size too large. Maximum size is 5MB.'
        };
    }

    return {
        valid: true
    };
}

module.exports = {
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    validateImage,
    BUNNY_CONFIG
};
