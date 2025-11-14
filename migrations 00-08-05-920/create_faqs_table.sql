-- Create FAQs table
CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some sample FAQs
INSERT INTO faqs (question, answer, display_order, is_active) VALUES
('What is your return policy?', 'We offer a 30-day return policy for all products. Items must be in original condition with tags attached.', 1, 1),
('How long does shipping take?', 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days.', 2, 1),
('Do you offer international shipping?', 'Currently, we only ship within India. International shipping will be available soon.', 3, 1),
('What payment methods do you accept?', 'We accept all major credit cards, UPI, net banking, and cash on delivery.', 4, 1),
('How can I track my order?', 'You will receive a tracking number via email once your order ships. You can also track it in your account dashboard.', 5, 1);
