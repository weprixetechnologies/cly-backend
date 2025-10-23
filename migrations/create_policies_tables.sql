-- Create policies table for Terms & Conditions, Privacy Policy, and Refund Policy
CREATE TABLE IF NOT EXISTS policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('terms_conditions', 'privacy_policy', 'refund_policy') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    UNIQUE KEY unique_active_policy (type, is_active),
    INDEX idx_type (type),
    INDEX idx_active (is_active)
);

-- Create contact_details table for managing contact information
CREATE TABLE IF NOT EXISTS contact_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('email', 'phone', 'address', 'social_media', 'other') NOT NULL,
    label VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_active (is_active),
    INDEX idx_display_order (display_order)
);

-- Insert default policies (inactive initially)
INSERT INTO policies (type, title, content, is_active, created_by) VALUES
('terms_conditions', 'Terms and Conditions', 'Please update this content with your terms and conditions.', FALSE, 1),
('privacy_policy', 'Privacy Policy', 'Please update this content with your privacy policy.', FALSE, 1),
('refund_policy', 'Refund Policy', 'Please update this content with your refund policy.', FALSE, 1);

-- Insert default contact details
INSERT INTO contact_details (type, label, value, display_order, is_active) VALUES
('email', 'Customer Support', 'support@example.com', 1, TRUE),
('phone', 'Customer Service', '+91 1234567890', 2, TRUE),
('address', 'Head Office', '123 Business Street, City, State, Country', 3, TRUE),
('social_media', 'Facebook', 'https://facebook.com/yourcompany', 4, TRUE),
('social_media', 'Instagram', 'https://instagram.com/yourcompany', 5, TRUE),
('social_media', 'Twitter', 'https://twitter.com/yourcompany', 6, TRUE);
