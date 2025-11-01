-- Add 'headquarter' type to contact_details ENUM
ALTER TABLE contact_details 
MODIFY COLUMN type ENUM('email', 'phone', 'address', 'social_media', 'other', 'headquarter') NOT NULL;

