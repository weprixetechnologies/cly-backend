-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    INDEX idx_expires_at (expires_at)
);

-- Add foreign key constraint if users table exists
-- ALTER TABLE password_reset_tokens 
-- ADD CONSTRAINT fk_password_reset_user_id 
-- FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE;

