-- Add address and payment fields to orders table
ALTER TABLE orders 
ADD COLUMN addressName VARCHAR(255) AFTER orderStatus,
ADD COLUMN addressPhone VARCHAR(20) AFTER addressName,
ADD COLUMN addressLine1 TEXT AFTER addressPhone,
ADD COLUMN addressLine2 TEXT AFTER addressLine1,
ADD COLUMN addressCity VARCHAR(100) AFTER addressLine2,
ADD COLUMN addressState VARCHAR(100) AFTER addressCity,
ADD COLUMN addressPincode VARCHAR(10) AFTER addressState,
ADD COLUMN paymentMode ENUM('COD', 'PREPAID', 'PHONEPE') DEFAULT 'COD' AFTER addressPincode,
ADD COLUMN couponCode VARCHAR(50) AFTER paymentMode;

