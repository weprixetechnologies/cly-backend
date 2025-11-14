-- Create sessions table for JWT refresh token management
CREATE TABLE IF NOT EXISTS sessions (
    sessionID      VARCHAR(100) PRIMARY KEY,
    refreshToken   TEXT NOT NULL,
    uid            VARCHAR(50) NOT NULL,
    expiry         DATETIME NOT NULL,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device         VARCHAR(255),
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
    INDEX idx_uid (uid),
    INDEX idx_refresh_token (refreshToken(255)),
    INDEX idx_expiry (expiry)
);

-- Create users table if it doesn't exist (with all necessary fields)
CREATE TABLE IF NOT EXISTS users (
    uid            VARCHAR(50) PRIMARY KEY,
    username       VARCHAR(100) UNIQUE NOT NULL,
    name           VARCHAR(255),
    photo          TEXT,
    emailID        VARCHAR(255) UNIQUE,
    phoneNumber    VARCHAR(20),
    gstin          VARCHAR(15),
    outstanding    DECIMAL(10,2) DEFAULT 0.00,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastLogin      DATETIME,
    status         ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    password       VARCHAR(255) NOT NULL,
    cartID         VARCHAR(50),
    role           ENUM('user', 'admin', 'manager') DEFAULT 'user',
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by    VARCHAR(50) NULL,
    approved_at    DATETIME NULL,
    INDEX idx_email (emailID),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_approval_status (approval_status)
);

