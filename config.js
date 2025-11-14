// Environment configuration
module.exports = {
    // Server Configuration
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Client URLs (for CORS)
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3001',

    // Database Configuration
    DATABASE: {
        HOST: process.env.DB_HOST || 'localhost',
        PORT: process.env.DB_PORT || 5432,
        NAME: process.env.DB_NAME || 'cly_database',
        USER: process.env.DB_USER || 'your_username',
        PASSWORD: process.env.DB_PASSWORD || 'your_password'
    },

    // JWT Configuration
    JWT: {
        SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
    },

    // API Configuration
    API: {
        KEY: process.env.API_KEY || 'your_api_key',
        EXTERNAL_URL: process.env.EXTERNAL_API_URL || 'https://api.example.com'
    },

    // File Upload Configuration
    UPLOAD: {
        MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 10485760, // 10MB
        UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads'
    }
};
