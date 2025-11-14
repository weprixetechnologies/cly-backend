-- Create about_us table
CREATE TABLE IF NOT EXISTS about_us (
    id INT PRIMARY KEY DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    mission TEXT,
    vision TEXT,
    company_values TEXT,
    is_active TINYINT(1) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default about us content
INSERT INTO about_us (title, content, mission, vision, company_values, is_active) VALUES
('About CLY - Cursive Letters Seller', 
'Welcome to CLY, India\'s largest stationary point for imported items. We are your one-stop destination for quality stationary products, offering a wide range of imported goods that meet the highest standards of quality and reliability.

Founded with a vision to provide premium stationary products to customers across India, CLY has grown to become a trusted name in the industry. Our commitment to excellence and customer satisfaction has made us the preferred choice for individuals, businesses, and educational institutions.

We understand the importance of quality stationary in your daily work and studies. That\'s why we carefully curate our product range to ensure that every item meets our strict quality standards. From premium pens and notebooks to specialized office supplies, we have everything you need to enhance your productivity and creativity.',

'To provide high-quality imported stationary products that enhance productivity and creativity for our customers across India.',

'To become the leading stationary retailer in India, known for our exceptional product quality, customer service, and innovation in the stationary industry.',

'Quality: We are committed to providing only the highest quality products.
Customer Satisfaction: Our customers\' needs and satisfaction are our top priority.
Innovation: We continuously seek new and better products to serve our customers.
Integrity: We conduct our business with honesty and transparency.
Excellence: We strive for excellence in everything we do.', 1);
