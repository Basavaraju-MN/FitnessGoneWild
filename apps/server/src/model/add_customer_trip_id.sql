-- Records which trip's brochure each customer downloaded.
-- Run once on every database (local and Hostinger).

ALTER TABLE `customers`
  ADD COLUMN `trip_id` int DEFAULT NULL AFTER `city`,
  ADD KEY `idx_customer_trip` (`trip_id`);

-- Allow the same phone number to download many brochures.
ALTER TABLE `customers`
  DROP INDEX `uq_customer_phone`,
  ADD KEY `idx_customer_phone` (`phone`);
