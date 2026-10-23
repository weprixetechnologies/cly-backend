-- Migration: Leads and Chatbot Widget Tables
-- Database: clydb (or current active database)

-- 1. Create leads table for capturing floating contact form & contact page inquiries
CREATE TABLE IF NOT EXISTS `leads` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `address` TEXT NULL,
    `requirement` TEXT NOT NULL,
    `source` VARCHAR(50) NOT NULL DEFAULT 'floating_form',
    `status` ENUM('new', 'contacted', 'in_progress', 'converted', 'closed') NOT NULL DEFAULT 'new',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status_created` (`status`, `created_at`),
    INDEX `idx_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Ensure site_settings table exists for key-value configuration
CREATE TABLE IF NOT EXISTS `site_settings` (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed default widget settings (if not already set)
INSERT IGNORE INTO `site_settings` (`key`, `value`)
VALUES (
    'widget_floating_settings',
    '{"contact_form_enabled":true,"chatbot_enabled":true,"contact_button_label":"Quick Inquiry","chatbot_button_label":"Chat with Us","chatbot_title":"CLY Assistant","chatbot_welcome_message":"Hi there! 👋 Welcome to Cursive Letters. How can we help you today?","contact_form_title":"Quick Inquiry","contact_form_subtitle":"Leave your contact and requirements. We will get back to you promptly!","shake_interval_seconds":6}'
);

-- 4. Seed default decision-tree chatbot flow (if not already set)
INSERT IGNORE INTO `site_settings` (`key`, `value`)
VALUES (
    'chatbot_flow_config',
    '{"initialStepId":"start","steps":[{"id":"start","message":"Hello! Welcome to Cursive Letters. What can we help you with today?","options":[{"id":"opt_products","label":"🛍️ Explore Products","action":"step","nextStepId":"products_step"},{"id":"opt_custom","label":"📝 Custom Order / Bulk Inquiry","action":"contact_form"},{"id":"opt_track","label":"📦 Track Order & FAQ","action":"step","nextStepId":"faq_step"},{"id":"opt_human","label":"💬 Speak with Us Directly","action":"step","nextStepId":"contact_options_step"}]},{"id":"products_step","message":"We offer imported premium stationery, art supplies, pens, notebooks, and aesthetic gifts. What would you like to explore?","options":[{"id":"opt_prod_catalog","label":"View All Products","action":"link","url":"/products","openInNewTab":false},{"id":"opt_prod_categories","label":"Browse Categories","action":"link","url":"/categories","openInNewTab":false},{"id":"opt_prod_bulk","label":"Custom Bulk Quotation","action":"contact_form"},{"id":"opt_prod_back","label":"« Back to Main Menu","action":"step","nextStepId":"start"}]},{"id":"faq_step","message":"You can check your order status from your Account Dashboard, or browse our frequently asked questions.","options":[{"id":"opt_faq_account","label":"My Account / Orders","action":"link","url":"/account","openInNewTab":false},{"id":"opt_faq_page","label":"View FAQs Page","action":"link","url":"/faq","openInNewTab":false},{"id":"opt_faq_help","label":"Send an Inquiry","action":"contact_form"},{"id":"opt_faq_back","label":"« Back to Main Menu","action":"step","nextStepId":"start"}]},{"id":"contact_options_step","message":"We would love to assist you! You can submit your requirements right here or view our Contact Us page for addresses and direct phone lines.","options":[{"id":"opt_co_form","label":"Fill Quick Inquiry Form","action":"contact_form"},{"id":"opt_co_page","label":"Visit Contact Page","action":"link","url":"/contact","openInNewTab":false},{"id":"opt_co_back","label":"« Back to Main Menu","action":"step","nextStepId":"start"}]}]}'
);
