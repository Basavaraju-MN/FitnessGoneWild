-- =====================================================================
-- Admin portal tables. Run once on every database (local and Hostinger).
--
-- Run these first if you have not yet:
--   apps/server/src/model/move_booking_to_bookings_table.sql  (bookings columns)
--   apps/server/src/model/add_departure_booking.sql           (departure_type)
-- =====================================================================

-- 1. Roles: Admin, Sales Team, Operations Team
ALTER TABLE `admin_users`
  MODIFY `role` enum('admin','sales','operations','editor') NOT NULL DEFAULT 'sales';

-- 2. Master data for trip coordination
CREATE TABLE IF NOT EXISTS `guides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Trip coordination = a departure (trip + dates) with its team
ALTER TABLE `departures`
  ADD COLUMN `guide_id` int DEFAULT NULL AFTER `status`,
  ADD COLUMN `trip_status` enum('upcoming','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming' AFTER `guide_id`;

-- 4. Payments received outside PhonePe (balance in cash, UPI, bank)
CREATE TABLE IF NOT EXISTS `booking_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('cash','upi','bank_transfer','card','phonepe','other') NOT NULL DEFAULT 'upi',
  `reference` varchar(120) DEFAULT NULL,
  `note` varchar(500) DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_payments_booking` (`booking_id`),
  KEY `idx_booking_payments_date` (`paid_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Brochure download leads with follow-up tracking
--    (the website adds a row on every brochure download)
CREATE TABLE IF NOT EXISTS `brochure_downloads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `trip_id` int DEFAULT NULL,
  `name` varchar(120) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `follow_up_status` enum('not_contacted','contacted','interested','converted','not_interested') NOT NULL DEFAULT 'not_contacted',
  `notes` varchar(500) DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `downloaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_brochure_downloads_trip` (`trip_id`),
  KEY `idx_brochure_downloads_status` (`follow_up_status`, `downloaded_at`),
  KEY `idx_brochure_downloads_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Enquiries: add the "interested" stage
ALTER TABLE `enquiries`
  MODIFY `status` enum('new','contacted','interested','booked','closed') NOT NULL DEFAULT 'new';

-- 7. Business settings shown in the Settings page
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`, `label`) VALUES
  ('business_name', 'The Fitness Gone Wild', 'Business name'),
  ('contact_email', 'gonewildfitness@gmail.com', 'Contact email'),
  ('contact_phone', '+91 87623 50551', 'Contact phone'),
  ('business_address', 'Rajajinagar, Bengaluru', 'Business address'),
  ('advance_per_ticket', '1500', 'Advance per ticket (₹)'),
  ('gst_percent', '5', 'GST (%)');

-- Optional: copy past brochure leads from customers (rows saved with a trip_id)
-- INSERT INTO brochure_downloads (customer_id, trip_id, name, phone, email, downloaded_at)
-- SELECT id, trip_id, name, phone, email, created_at FROM customers WHERE trip_id IS NOT NULL;
