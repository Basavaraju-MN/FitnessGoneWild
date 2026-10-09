-- Booking details live in `bookings`; `phonepe_transactions` keeps only
-- payment data (+ the booking_details JSON it always had).
-- Run once on every database (local and Hostinger).
-- Replaces add_transaction_booking_columns.sql and part 2 of
-- add_departure_booking.sql (departures.departure_type stays).

-- 1. Remove the booking columns added to phonepe_transactions
ALTER TABLE `phonepe_transactions`
  DROP INDEX `idx_trip_id`,
  DROP INDEX `idx_trek_start_date`,
  DROP INDEX `idx_departure_id`,
  DROP COLUMN `trip_id`,
  DROP COLUMN `departure_id`,
  DROP COLUMN `trek_name`,
  DROP COLUMN `trek_start_date`,
  DROP COLUMN `trek_end_date`,
  DROP COLUMN `trip_days`,
  DROP COLUMN `is_custom_trip`,
  DROP COLUMN `customer_name`,
  DROP COLUMN `customer_phone`,
  DROP COLUMN `customer_email`,
  DROP COLUMN `pickup_location`,
  DROP COLUMN `total_persons`,
  DROP COLUMN `with_transport_persons`,
  DROP COLUMN `without_transport_persons`,
  DROP COLUMN `travel_mode`,
  DROP COLUMN `payment_type`,
  DROP COLUMN `trip_total`,
  DROP COLUMN `advance_amount`,
  DROP COLUMN `balance_amount`;

-- 2. Booking details on bookings
--    amount      = full trip total (incl. GST)
--    amount_paid = paid now (full amount or advance)
--    people      = total travellers
ALTER TABLE `bookings`
  ADD COLUMN `trip_id` int DEFAULT NULL AFTER `customer_id`,
  ADD COLUMN `with_transport_people` tinyint NOT NULL DEFAULT 0 AFTER `people`,
  ADD COLUMN `without_transport_people` tinyint NOT NULL DEFAULT 0 AFTER `with_transport_people`,
  ADD COLUMN `travel_mode` enum('with_transport','without_transport','mixed') DEFAULT NULL AFTER `without_transport_people`,
  ADD COLUMN `trek_start_date` date DEFAULT NULL AFTER `travel_mode`,
  ADD COLUMN `trek_end_date` date DEFAULT NULL AFTER `trek_start_date`,
  ADD COLUMN `trip_days` tinyint DEFAULT NULL AFTER `trek_end_date`,
  ADD COLUMN `is_custom_trip` tinyint(1) NOT NULL DEFAULT 0 AFTER `trip_days`,
  ADD COLUMN `advance_amount` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `amount_paid`,
  ADD COLUMN `balance_amount` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `advance_amount`,
  ADD COLUMN `payment_type` enum('full','advance') NOT NULL DEFAULT 'full' AFTER `balance_amount`,
  ADD COLUMN `merchant_order_id` varchar(100) DEFAULT NULL AFTER `payment_status`,
  ADD COLUMN `payment_transaction_id` varchar(150) DEFAULT NULL AFTER `merchant_order_id`,
  ADD COLUMN `phonepe_order_id` varchar(100) DEFAULT NULL AFTER `payment_transaction_id`,
  ADD COLUMN `payment_method` varchar(100) DEFAULT NULL AFTER `phonepe_order_id`,
  ADD COLUMN `paid_at` datetime DEFAULT NULL AFTER `payment_method`,
  ADD UNIQUE KEY `uq_bookings_merchant_order` (`merchant_order_id`),
  ADD KEY `idx_bookings_trip` (`trip_id`),
  ADD KEY `idx_bookings_trek_date` (`trek_start_date`);
