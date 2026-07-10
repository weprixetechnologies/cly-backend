-- ============================================================
-- CLY Affiliate System – Full Migration Script
-- Run this on a fresh server where these tables do NOT exist yet.
-- Safe to run: uses IF NOT EXISTS / IF EXISTS throughout.
-- ============================================================

-- 1. Core affiliates table (one row per user)
CREATE TABLE IF NOT EXISTS `affiliates` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(255) NOT NULL,
  `referral_code` VARCHAR(20) NOT NULL,
  `status` ENUM('ACTIVE','SUSPENDED') DEFAULT 'ACTIVE',
  `total_clicks` INT(11) DEFAULT 0,
  `total_orders` INT(11) DEFAULT 0,
  `total_commission_earned` DECIMAL(12,2) DEFAULT 0.00,
  `total_commission_paid` DECIMAL(12,2) DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referral_code` (`referral_code`),
  UNIQUE KEY `unique_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Custom affiliate links (product-specific or general short links)
CREATE TABLE IF NOT EXISTS `affiliate_links` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `affiliate_id` BIGINT(20) NOT NULL,
  `type` ENUM('PRODUCT','GENERAL') NOT NULL,
  `productID` VARCHAR(255) DEFAULT NULL,
  `slug` VARCHAR(40) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `clicks` INT(11) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `affiliate_id` (`affiliate_id`),
  CONSTRAINT `affiliate_links_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Click → customer attribution (last-click-wins, 30-day window)
CREATE TABLE IF NOT EXISTS `affiliate_attributions` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `customer_uid` VARCHAR(255) NOT NULL,
  `affiliate_link_id` BIGINT(20) DEFAULT NULL,
  `affiliate_id` BIGINT(20) NOT NULL,
  `attributed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `affiliate_link_id` (`affiliate_link_id`),
  KEY `affiliate_id` (`affiliate_id`),
  KEY `idx_customer_uid` (`customer_uid`),
  CONSTRAINT `affiliate_attributions_ibfk_1` FOREIGN KEY (`affiliate_link_id`) REFERENCES `affiliate_links` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affiliate_attributions_ibfk_2` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Per-order commission ledger
CREATE TABLE IF NOT EXISTS `affiliate_commissions` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `orderID` VARCHAR(255) NOT NULL,
  `affiliate_id` BIGINT(20) NOT NULL,
  `affiliate_link_id` BIGINT(20) DEFAULT NULL,
  `order_amount` DECIMAL(12,2) NOT NULL,
  `commission_percentage_applied` DECIMAL(5,2) NOT NULL,
  `commission_cap_applied` DECIMAL(12,2) DEFAULT NULL,
  `commission_amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED','VOIDED','PAID') DEFAULT 'PENDING',
  `voided_reason` VARCHAR(255) DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orderID` (`orderID`),
  KEY `affiliate_id` (`affiliate_id`),
  KEY `affiliate_link_id` (`affiliate_link_id`),
  KEY `idx_orderID` (`orderID`),
  KEY `idx_status` (`status`),
  CONSTRAINT `affiliate_commissions_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affiliate_commissions_ibfk_2` FOREIGN KEY (`affiliate_link_id`) REFERENCES `affiliate_links` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Payout records (admin marks commissions as paid)
CREATE TABLE IF NOT EXISTS `affiliate_payouts` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `affiliate_id` BIGINT(20) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payout_method_note` VARCHAR(255) NOT NULL,
  `marked_paid_by_uid` VARCHAR(255) DEFAULT NULL,
  `paid_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `affiliate_id` (`affiliate_id`),
  CONSTRAINT `affiliate_payouts_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Many-to-many: which commissions were included in a payout
CREATE TABLE IF NOT EXISTS `affiliate_payout_commissions` (
  `payout_id` BIGINT(20) NOT NULL,
  `commission_id` BIGINT(20) NOT NULL,
  PRIMARY KEY (`payout_id`,`commission_id`),
  KEY `commission_id` (`commission_id`),
  CONSTRAINT `affiliate_payout_commissions_ibfk_1` FOREIGN KEY (`payout_id`) REFERENCES `affiliate_payouts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affiliate_payout_commissions_ibfk_2` FOREIGN KEY (`commission_id`) REFERENCES `affiliate_commissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 7. Global / per-product commission settings
CREATE TABLE IF NOT EXISTS `affiliate_settings` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `scope` ENUM('GLOBAL','PRODUCT') NOT NULL,
  `productID` VARCHAR(255) DEFAULT NULL,
  `commission_percentage` DECIMAL(5,2) NOT NULL,
  `commission_cap_amount` DECIMAL(12,2) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `effective_from` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by_uid` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 8. Seed default global commission settings (5%, cap ₹100)
INSERT INTO `affiliate_settings` (`scope`, `commission_percentage`, `commission_cap_amount`, `is_active`)
SELECT 'GLOBAL', 5.00, 100.00, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `affiliate_settings` WHERE `scope` = 'GLOBAL' AND `is_active` = 1
);

-- ============================================================
-- Done! 7 tables created, 1 default setting seeded.
-- ============================================================
