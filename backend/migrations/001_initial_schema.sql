-- ─────────────────────────────────────────────────────────────────────────────
-- EcoCycle E-Waste Management & Recycling Optimization System
-- Migration 001: Initial Relational Database Schema
--
-- TARGET DATABASE: MySQL 8.0+
-- CHARACTER SET:   utf8mb4 (Full Unicode support for international text)
-- COLLATION:       utf8mb4_unicode_ci
--
-- DESIGN PRINCIPLES:
-- 1. Strict 3NF normalization preserving all existing application rules.
-- 2. Foreign keys with appropriate ON DELETE actions (CASCADE / SET NULL).
-- 3. Composite indexes optimized for frequent query access paths (by user,
--    by centre, by status, by date window, and by coordinates).
-- 4. Audit logging preserving event timeline history for all declarations.
-- 5. Safe password hashing column specifications (bcrypt / argon2 support).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Users (Customer Accounts) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `user_type` VARCHAR(50) NOT NULL DEFAULT 'Individual Resident',
  `avatar_color` VARCHAR(50) NULL DEFAULT 'bg-[#FF7028]',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `password_updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. User Preferences (1-to-1 with Users) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `user_id` VARCHAR(64) NOT NULL,
  `appointment_confirmations` BOOLEAN NOT NULL DEFAULT TRUE,
  `status_updates` BOOLEAN NOT NULL DEFAULT TRUE,
  `cancellation_alerts` BOOLEAN NOT NULL DEFAULT TRUE,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_preferences_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. User Addresses (Saved Customer Address Book) ──────────────────────────
CREATE TABLE IF NOT EXISTS `user_addresses` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `label` VARCHAR(100) NOT NULL DEFAULT 'Home',
  `address_line` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NULL,
  `postal_code` VARCHAR(30) NULL,
  `pickup_instructions` TEXT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT FALSE,
  `latitude` DECIMAL(10, 8) NULL,
  `longitude` DECIMAL(11, 8) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_addresses_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_user_addresses_user` (`user_id`),
  INDEX `idx_user_addresses_default` (`user_id`, `is_default`),
  INDEX `idx_user_addresses_coords` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Recycling Centres (Partner Facilities) ────────────────────────────────
CREATE TABLE IF NOT EXISTS `recycling_centres` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `service_area` VARCHAR(255) NOT NULL,
  `capabilities` TEXT NULL,
  `max_weekly_capacity_kg` DECIMAL(10, 2) NOT NULL DEFAULT 3000.00,
  `max_weekly_units` INT NOT NULL DEFAULT 800,
  `slot_limit_kg` DECIMAL(10, 2) NOT NULL DEFAULT 250.00,
  `lead_time_days` INT NOT NULL DEFAULT 2,
  `pickup_available` BOOLEAN NOT NULL DEFAULT TRUE,
  `dropoff_available` BOOLEAN NOT NULL DEFAULT TRUE,
  `opening_time` CHAR(5) NOT NULL DEFAULT '09:00',
  `closing_time` CHAR(5) NOT NULL DEFAULT '17:00',
  `operating_days_summary` VARCHAR(255) NULL DEFAULT 'Monday to Friday',
  `operating_hours_summary` VARCHAR(255) NULL DEFAULT '09:00 AM – 05:00 PM',
  `latitude` DECIMAL(10, 8) NULL,
  `longitude` DECIMAL(11, 8) NULL,
  `staff_name` VARCHAR(255) NULL DEFAULT 'Facility Operations Lead',
  `staff_role` VARCHAR(100) NULL DEFAULT 'Operations Lead',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `password_updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_centres_email` (`email`),
  INDEX `idx_centres_email` (`email`),
  INDEX `idx_centres_city` (`city`),
  INDEX `idx_centres_coords` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Centre Operating Days (Normalized Active Days) ────────────────────────
CREATE TABLE IF NOT EXISTS `centre_operating_days` (
  `centre_id` VARCHAR(64) NOT NULL,
  `day_of_week` ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun') NOT NULL,
  PRIMARY KEY (`centre_id`, `day_of_week`),
  CONSTRAINT `fk_centre_operating_days_centre`
    FOREIGN KEY (`centre_id`) REFERENCES `recycling_centres` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. Centre Accepted Waste Categories ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `centre_accepted_categories` (
  `centre_id` VARCHAR(64) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`centre_id`, `category`),
  CONSTRAINT `fk_centre_accepted_categories_centre`
    FOREIGN KEY (`centre_id`) REFERENCES `recycling_centres` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_centre_categories_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. Collection Requests (Master E-Waste Declarations) ─────────────────────
CREATE TABLE IF NOT EXISTS `collection_requests` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NULL,
  `user_email` VARCHAR(255) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(50) NULL,
  `centre_id` VARCHAR(64) NULL,
  `centre_name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `brand` VARCHAR(100) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `items` VARCHAR(255) NOT NULL,
  `condition_state` VARCHAR(50) NOT NULL DEFAULT 'working',
  `quantity` INT NOT NULL DEFAULT 1,
  `declared_weight_kg` DECIMAL(10, 2) NOT NULL,
  `received_weight_kg` DECIMAL(10, 2) NULL,
  `weight_discrepancy_kg` DECIMAL(10, 2) NULL,
  `method` ENUM('pickup', 'dropoff') NOT NULL DEFAULT 'dropoff',
  `channel` VARCHAR(50) NOT NULL DEFAULT 'Center Drop-off',
  `pickup_address` TEXT NULL,
  `dropoff_facility_address` TEXT NULL,
  `dropoff_facility_city` VARCHAR(100) NULL,
  `dropoff_facility_hours` VARCHAR(100) NULL,
  `latitude` DECIMAL(10, 8) NULL,
  `longitude` DECIMAL(11, 8) NULL,
  `preferred_slot` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `status` ENUM(
    'Submitted',
    'Accepted',
    'Schedule Proposed',
    'Scheduled',
    'Confirmed',
    'In Transit',
    'Reschedule Requested',
    'Received',
    'Drop-off Completed',
    'Processing',
    'Completed',
    'Recycled',
    'Rejected',
    'Cancelled'
  ) NOT NULL DEFAULT 'Submitted',
  `current_step` INT NOT NULL DEFAULT 0,
  `rejection_reason` TEXT NULL,
  `cancellation_reason` TEXT NULL,
  `cancelled_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_requests_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_requests_centre`
    FOREIGN KEY (`centre_id`) REFERENCES `recycling_centres` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_requests_user_email` (`user_email`),
  INDEX `idx_requests_centre_id` (`centre_id`),
  INDEX `idx_requests_status` (`status`),
  INDEX `idx_requests_category` (`category`),
  INDEX `idx_requests_method` (`method`),
  INDEX `idx_requests_created_at` (`created_at`),
  INDEX `idx_requests_centre_status` (`centre_id`, `status`),
  INDEX `idx_requests_capacity` (`centre_id`, `status`, `declared_weight_kg`, `quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. Appointments (Scheduled Collection & Drop-off Slots) ──────────────────
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` VARCHAR(64) NOT NULL,
  `request_id` VARCHAR(64) NOT NULL,
  `centre_id` VARCHAR(64) NULL,
  `booking_ref` VARCHAR(64) NOT NULL,
  `type` ENUM('pickup', 'dropoff') NOT NULL DEFAULT 'dropoff',
  `appointment_date` DATE NOT NULL,
  `time_slot` VARCHAR(50) NOT NULL,
  `time_window` VARCHAR(50) NOT NULL,
  `status` ENUM('proposed', 'confirmed', 'reschedule_requested', 'cancelled', 'completed') NOT NULL DEFAULT 'proposed',
  `instructions` TEXT NULL,
  `pickup_address` TEXT NULL,
  `latitude` DECIMAL(10, 8) NULL,
  `longitude` DECIMAL(11, 8) NULL,
  `customer_note` TEXT NULL,
  `previous_appointment_date` DATE NULL,
  `previous_time_slot` VARCHAR(50) NULL,
  `booked_by` VARCHAR(255) NULL,
  `booked_at` TIMESTAMP NULL,
  `proposed_by` VARCHAR(255) NULL,
  `proposed_at` TIMESTAMP NULL,
  `rescheduled_by` VARCHAR(255) NULL,
  `rescheduled_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_appointments_request` (`request_id`),
  UNIQUE KEY `uq_appointments_booking_ref` (`booking_ref`),
  CONSTRAINT `fk_appointments_request`
    FOREIGN KEY (`request_id`) REFERENCES `collection_requests` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_appointments_centre`
    FOREIGN KEY (`centre_id`) REFERENCES `recycling_centres` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_appointments_centre_date` (`centre_id`, `appointment_date`),
  INDEX `idx_appointments_date_slot` (`appointment_date`, `time_slot`),
  INDEX `idx_appointments_status` (`status`),
  INDEX `idx_appointments_capacity` (`centre_id`, `appointment_date`, `time_slot`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. Request History (Immutable Audit Log & Lifecycle Trail) ───────────────
CREATE TABLE IF NOT EXISTS `request_history` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `request_id` VARCHAR(64) NOT NULL,
  `event_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `event_time_formatted` VARCHAR(100) NULL,
  `event_description` TEXT NOT NULL,
  `actor` ENUM('Customer', 'Centre Staff', 'System') NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_request_history_request`
    FOREIGN KEY (`request_id`) REFERENCES `collection_requests` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_history_request_id` (`request_id`),
  INDEX `idx_history_event_time` (`event_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. Request Visibility (History Hiding / Archiving) ───────────────────────
CREATE TABLE IF NOT EXISTS `request_visibility` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `request_id` VARCHAR(64) NOT NULL,
  `hidden_by_type` ENUM('customer', 'centre') NOT NULL,
  `hidden_by_id` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_request_visibility_request`
    FOREIGN KEY (`request_id`) REFERENCES `collection_requests` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_visibility_request_actor` (`request_id`, `hidden_by_type`, `hidden_by_id`),
  INDEX `idx_visibility_actor` (`hidden_by_type`, `hidden_by_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
