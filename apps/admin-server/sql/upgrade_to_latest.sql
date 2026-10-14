-- =====================================================================
-- Fitness Gone Wild — bring a database up to the latest structure
-- (same as fulldb.sql, 14 Oct 2026). Safe to run more than once:
-- every step checks first and skips what is already done.
--
-- Covers all of these (you do not need to run them one by one):
--   server/src/model: add_customer_trip_id, add_departure_booking,
--     add_pickup_point_trip_id, brochure_files_on_disk,
--     move_booking_to_bookings_table
--   admin-server/sql: admin_portal, leads_merge, remove_drivers_vehicles,
--     google_reviews, refunds, lead_statuses, clear_default_lead_notes,
--     rich_text
--
-- How: phpMyAdmin → select the database → SQL tab → paste all → Go.
-- Take a backup first (Export) — it is a live database.
-- =====================================================================

DELIMITER $$

-- ---------- Helpers (removed again at the end) ----------
DROP PROCEDURE IF EXISTS fgw_run $$
CREATE PROCEDURE fgw_run(IN stmt TEXT)
BEGIN
  SET @fgw_sql = stmt;
  PREPARE s FROM @fgw_sql;
  EXECUTE s;
  DEALLOCATE PREPARE s;
END $$

DROP PROCEDURE IF EXISTS fgw_add_column $$
CREATE PROCEDURE fgw_add_column(IN t VARCHAR(64), IN c VARCHAR(64), IN def TEXT)
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = t)
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = t AND COLUMN_NAME = c) THEN
    CALL fgw_run(CONCAT('ALTER TABLE `', t, '` ADD COLUMN `', c, '` ', def));
  END IF;
END $$

DROP PROCEDURE IF EXISTS fgw_drop_column $$
CREATE PROCEDURE fgw_drop_column(IN t VARCHAR(64), IN c VARCHAR(64))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = t AND COLUMN_NAME = c) THEN
    CALL fgw_run(CONCAT('ALTER TABLE `', t, '` DROP COLUMN `', c, '`'));
  END IF;
END $$

DROP PROCEDURE IF EXISTS fgw_drop_index $$
CREATE PROCEDURE fgw_drop_index(IN t VARCHAR(64), IN i VARCHAR(64))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = t AND INDEX_NAME = i) THEN
    CALL fgw_run(CONCAT('ALTER TABLE `', t, '` DROP INDEX `', i, '`'));
  END IF;
END $$

-- def e.g. 'UNIQUE KEY `uq_x` (`a`,`b`)' or 'KEY `idx_x` (`a`)'
DROP PROCEDURE IF EXISTS fgw_add_index $$
CREATE PROCEDURE fgw_add_index(IN t VARCHAR(64), IN i VARCHAR(64), IN def TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = t AND INDEX_NAME = i) THEN
    CALL fgw_run(CONCAT('ALTER TABLE `', t, '` ADD ', def));
  END IF;
END $$

DROP PROCEDURE IF EXISTS fgw_upgrade $$
CREATE PROCEDURE fgw_upgrade()
BEGIN
  /* ================= 1. Website migrations ================= */

  -- customers: trip of the first booking; phone no longer unique
  CALL fgw_add_column('customers', 'trip_id', 'int DEFAULT NULL AFTER `city`');
  CALL fgw_add_index('customers', 'idx_customer_trip', 'KEY `idx_customer_trip` (`trip_id`)');
  CALL fgw_drop_index('customers', 'uq_customer_phone');
  CALL fgw_add_index('customers', 'idx_customer_phone', 'KEY `idx_customer_phone` (`phone`)');

  -- departures: scheduled / custom, one row per trip + dates + type
  CALL fgw_add_column('departures', 'departure_type', "enum('scheduled','custom') NOT NULL DEFAULT 'scheduled' AFTER `end_date`");
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()
                 AND TABLE_NAME = 'departures' AND INDEX_NAME = 'uq_departure' AND COLUMN_NAME = 'departure_type') THEN
    CALL fgw_drop_index('departures', 'uq_departure');
    CALL fgw_run('ALTER TABLE `departures` ADD UNIQUE KEY `uq_departure` (`trip_id`, `start_date`, `end_date`, `departure_type`)');
  END IF;
  CALL fgw_add_index('departures', 'idx_departures_trip', 'KEY `idx_departures_trip` (`trip_id`)');

  -- pickup_points: per trip
  CALL fgw_add_column('pickup_points', 'trip_id', 'int DEFAULT NULL AFTER `id`');
  CALL fgw_drop_index('pickup_points', 'name');
  CALL fgw_add_index('pickup_points', 'uq_pickup_trip_name', 'UNIQUE KEY `uq_pickup_trip_name` (`trip_id`, `name`)');
  CALL fgw_add_index('pickup_points', 'idx_pickup_trip', 'KEY `idx_pickup_trip` (`trip_id`)');

  -- brochures: PDFs live on disk; this table only counts downloads
  CALL fgw_run('ALTER TABLE `brochures` MODIFY `file_data` longblob NULL, MODIFY `file_size` int UNSIGNED NOT NULL DEFAULT 0');

  -- trips: "without transport" price is optional (backpacking trips)
  CALL fgw_run("ALTER TABLE `trips` MODIFY `without_transport_price` decimal(10,2) DEFAULT '0.00'");
  -- trips: short description holds rich text (HTML)
  CALL fgw_run('ALTER TABLE `trips` MODIFY `blurb` text NOT NULL');

  -- bookings: everything about a booking (moved out of phonepe_transactions)
  CALL fgw_add_column('bookings', 'trip_id', 'int DEFAULT NULL AFTER `customer_id`');
  CALL fgw_add_column('bookings', 'with_transport_people', 'tinyint NOT NULL DEFAULT 0 AFTER `people`');
  CALL fgw_add_column('bookings', 'without_transport_people', 'tinyint NOT NULL DEFAULT 0 AFTER `with_transport_people`');
  CALL fgw_add_column('bookings', 'travel_mode', "enum('with_transport','without_transport','mixed') DEFAULT NULL AFTER `without_transport_people`");
  CALL fgw_add_column('bookings', 'trek_start_date', 'date DEFAULT NULL AFTER `travel_mode`');
  CALL fgw_add_column('bookings', 'trek_end_date', 'date DEFAULT NULL AFTER `trek_start_date`');
  CALL fgw_add_column('bookings', 'trip_days', 'tinyint DEFAULT NULL AFTER `trek_end_date`');
  CALL fgw_add_column('bookings', 'is_custom_trip', 'tinyint(1) NOT NULL DEFAULT 0 AFTER `trip_days`');
  CALL fgw_add_column('bookings', 'advance_amount', 'decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `amount_paid`');
  CALL fgw_add_column('bookings', 'balance_amount', 'decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `advance_amount`');
  CALL fgw_add_column('bookings', 'payment_type', "enum('full','advance') NOT NULL DEFAULT 'full' AFTER `balance_amount`");
  CALL fgw_add_column('bookings', 'merchant_order_id', 'varchar(100) DEFAULT NULL AFTER `payment_status`');
  CALL fgw_add_column('bookings', 'payment_transaction_id', 'varchar(150) DEFAULT NULL AFTER `merchant_order_id`');
  CALL fgw_add_column('bookings', 'phonepe_order_id', 'varchar(100) DEFAULT NULL AFTER `payment_transaction_id`');
  CALL fgw_add_column('bookings', 'payment_method', 'varchar(100) DEFAULT NULL AFTER `phonepe_order_id`');
  CALL fgw_add_column('bookings', 'paid_at', 'datetime DEFAULT NULL AFTER `payment_method`');
  CALL fgw_add_index('bookings', 'uq_bookings_merchant_order', 'UNIQUE KEY `uq_bookings_merchant_order` (`merchant_order_id`)');
  CALL fgw_add_index('bookings', 'idx_bookings_trip', 'KEY `idx_bookings_trip` (`trip_id`)');
  CALL fgw_add_index('bookings', 'idx_bookings_trek_date', 'KEY `idx_bookings_trek_date` (`trek_start_date`)');

  -- phonepe_transactions: booking columns no longer used (kept in booking_details JSON)
  CALL fgw_drop_index('phonepe_transactions', 'idx_trip_id');
  CALL fgw_drop_index('phonepe_transactions', 'idx_trek_start_date');
  CALL fgw_drop_index('phonepe_transactions', 'idx_departure_id');
  CALL fgw_drop_column('phonepe_transactions', 'trip_id');
  CALL fgw_drop_column('phonepe_transactions', 'departure_id');
  CALL fgw_drop_column('phonepe_transactions', 'trek_name');
  CALL fgw_drop_column('phonepe_transactions', 'trek_start_date');
  CALL fgw_drop_column('phonepe_transactions', 'trek_end_date');
  CALL fgw_drop_column('phonepe_transactions', 'trip_days');
  CALL fgw_drop_column('phonepe_transactions', 'is_custom_trip');
  CALL fgw_drop_column('phonepe_transactions', 'customer_name');
  CALL fgw_drop_column('phonepe_transactions', 'customer_phone');
  CALL fgw_drop_column('phonepe_transactions', 'customer_email');
  CALL fgw_drop_column('phonepe_transactions', 'pickup_location');
  CALL fgw_drop_column('phonepe_transactions', 'total_persons');
  CALL fgw_drop_column('phonepe_transactions', 'with_transport_persons');
  CALL fgw_drop_column('phonepe_transactions', 'without_transport_persons');
  CALL fgw_drop_column('phonepe_transactions', 'travel_mode');
  CALL fgw_drop_column('phonepe_transactions', 'payment_type');
  CALL fgw_drop_column('phonepe_transactions', 'trip_total');
  CALL fgw_drop_column('phonepe_transactions', 'advance_amount');
  CALL fgw_drop_column('phonepe_transactions', 'balance_amount');

  /* ================= 2. Admin portal ================= */

  CALL fgw_run("ALTER TABLE `admin_users` MODIFY `role` enum('admin','sales','operations','editor') NOT NULL DEFAULT 'sales'");

  -- Trip coordination: guide + trip status (drivers / vehicles removed)
  CALL fgw_add_column('departures', 'guide_id', 'int DEFAULT NULL AFTER `status`');
  CALL fgw_add_column('departures', 'trip_status', "enum('upcoming','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming' AFTER `guide_id`");
  CALL fgw_drop_column('departures', 'driver_id');
  CALL fgw_drop_column('departures', 'vehicle_id');

  -- Refunds: total refunded on the booking
  CALL fgw_add_column('bookings', 'refund_amount', 'decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `balance_amount`');
  CALL fgw_add_column('bookings', 'refunded_at', 'datetime DEFAULT NULL AFTER `refund_amount`');
  CALL fgw_drop_column('bookings', 'refund_method');
  CALL fgw_drop_column('bookings', 'refund_reference');

  -- Enquiries & Leads: brochure as a source; status = a lead_statuses key
  CALL fgw_run("ALTER TABLE `enquiries` MODIFY `source` enum('website','brochure','whatsapp','phone','instagram','walkin') NOT NULL DEFAULT 'website'");
  CALL fgw_run("ALTER TABLE `enquiries` MODIFY `status` varchar(40) NOT NULL DEFAULT 'new'");

  -- Reviews: Google reviews next to website reviews
  CALL fgw_run("ALTER TABLE `reviews` MODIFY `trip_id` int DEFAULT NULL, MODIFY `body` varchar(4100) NOT NULL DEFAULT ''");
  CALL fgw_add_column('reviews', 'source', "enum('website','google') NOT NULL DEFAULT 'website' AFTER `id`");
  CALL fgw_add_column('reviews', 'google_review_id', 'varchar(191) DEFAULT NULL AFTER `source`');
  CALL fgw_add_column('reviews', 'author_photo_url', 'varchar(500) DEFAULT NULL AFTER `author_name`');
  CALL fgw_add_column('reviews', 'owner_reply', 'varchar(4100) DEFAULT NULL AFTER `body`');
  CALL fgw_add_column('reviews', 'updated_at', 'timestamp NULL DEFAULT NULL AFTER `published_at`');
  CALL fgw_add_index('reviews', 'uq_reviews_google', 'UNIQUE KEY `uq_reviews_google` (`google_review_id`)');
END $$

DELIMITER ;

/* ================= New tables ================= */

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

CREATE TABLE IF NOT EXISTS `booking_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `mode` enum('phonepe','manual') NOT NULL,
  `method` varchar(30) DEFAULT NULL,
  `merchant_refund_id` varchar(64) DEFAULT NULL,
  `phonepe_refund_id` varchar(100) DEFAULT NULL,
  `state` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
  `reference` varchar(120) DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `error_message` varchar(500) DEFAULT NULL,
  `initiated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_merchant_refund_id` (`merchant_refund_id`),
  KEY `idx_refunds_booking` (`booking_id`),
  KEY `idx_refunds_state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Kept only as a record of old brochure leads (now in enquiries)
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

CREATE TABLE IF NOT EXISTS `google_business` (
  `id` tinyint NOT NULL DEFAULT 1,
  `refresh_token` varchar(1024) DEFAULT NULL,
  `connected_email` varchar(190) DEFAULT NULL,
  `account_name` varchar(120) DEFAULT NULL,
  `location_name` varchar(120) DEFAULT NULL,
  `location_title` varchar(255) DEFAULT NULL,
  `average_rating` decimal(2,1) DEFAULT NULL,
  `total_reviews` int DEFAULT NULL,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `last_error` varchar(500) DEFAULT NULL,
  `connected_by` int DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `lead_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_key` varchar(40) NOT NULL,
  `label` varchar(60) NOT NULL,
  `stage` enum('open','won','lost') NOT NULL DEFAULT 'open',
  `tone` enum('blue','amber','green','red','grey') NOT NULL DEFAULT 'blue',
  `sort_order` smallint NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lead_status_key` (`status_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/* ================= Column / index changes ================= */
CALL fgw_upgrade();

/* ================= Data ================= */

-- Lead statuses (existing ones are left as they are)
INSERT IGNORE INTO `lead_statuses` (`status_key`, `label`, `stage`, `tone`, `sort_order`, `is_system`) VALUES
  ('new',               'New Enquiry',       'open', 'blue',  1, 1),
  ('call_not_picked',   'Call Not Picked',   'open', 'amber', 2, 0),
  ('call_not_picked_2', 'Call not picked 2', 'open', 'amber', 3, 0),
  ('call_not_picked_3', 'Call not picked 3', 'open', 'red',   4, 0),
  ('follow_up',         'Follow up',         'open', 'amber', 5, 0),
  ('plan_quote_sent',   'Plan & Quote Sent', 'open', 'blue',  6, 0),
  ('awaiting_payment',  'Awaiting Payment',  'open', 'amber', 7, 0),
  ('booked',            'Booked',            'won',  'green', 8, 1),
  ('lost_closed',       'Lost & Closed',     'lost', 'grey',  9, 1),
  ('future_prospect',   'Future Prospect',   'open', 'blue', 10, 0),
  ('duplicate',         'Duplicate',         'lost', 'grey', 11, 0);

-- Old brochure leads -> Enquiries & Leads (each copied once; empty note)
INSERT INTO `enquiries`
  (`customer_id`, `name`, `phone`, `email`, `trip_id`, `people`, `note`, `status`, `source`, `assigned_to`, `received_at`)
SELECT bd.customer_id, bd.name, bd.phone, bd.email, bd.trip_id, 1,
       NULLIF(bd.notes, 'Downloaded the brochure'),
       CASE bd.follow_up_status
         WHEN 'not_contacted' THEN 'new'
         WHEN 'converted' THEN 'booked'
         WHEN 'not_interested' THEN 'lost_closed'
         ELSE 'follow_up'
       END,
       'brochure', bd.assigned_to, bd.downloaded_at
FROM `brochure_downloads` bd
WHERE NOT EXISTS (
  SELECT 1 FROM `enquiries` e
  WHERE e.source = 'brochure' AND e.phone = bd.phone
    AND e.received_at = bd.downloaded_at AND (e.trip_id <=> bd.trip_id)
);

-- Old lead statuses -> new ones
UPDATE `enquiries` SET `status` = 'follow_up'   WHERE `status` IN ('contacted', 'interested');
UPDATE `enquiries` SET `status` = 'lost_closed' WHERE `status` = 'closed';

-- Brochure leads start with an empty note (for the sales team)
UPDATE `enquiries` SET `note` = NULL
WHERE `source` = 'brochure' AND `note` LIKE 'Downloaded the brochure%';

-- Drivers and vehicles are no longer used
DROP TABLE IF EXISTS `drivers`;
DROP TABLE IF EXISTS `vehicles`;

-- Settings page (existing values are kept)
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`, `label`) VALUES
  ('business_name', 'The Fitness Gone Wild', 'Business name'),
  ('contact_email', 'gonewildfitness@gmail.com', 'Contact email'),
  ('contact_phone', '+91 87623 50551', 'Contact phone'),
  ('business_address', 'Rajajinagar, Bengaluru', 'Business address'),
  ('advance_per_ticket', '1500', 'Advance per ticket (₹)'),
  ('gst_percent', '5', 'GST (%)');

/* ================= Clean up helpers ================= */
DROP PROCEDURE IF EXISTS fgw_upgrade;
DROP PROCEDURE IF EXISTS fgw_add_index;
DROP PROCEDURE IF EXISTS fgw_drop_index;
DROP PROCEDURE IF EXISTS fgw_drop_column;
DROP PROCEDURE IF EXISTS fgw_add_column;
DROP PROCEDURE IF EXISTS fgw_run;
