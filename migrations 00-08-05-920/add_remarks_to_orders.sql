-- Add remarks column to orders table
ALTER TABLE orders ADD COLUMN remarks TEXT DEFAULT NULL AFTER admin_notes;
