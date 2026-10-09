-- Pickup points per trip.
-- Each pickup point belongs to one trip (trip_id). Points with no trip_id are not shown.
-- Run once on every database (local and Hostinger).

ALTER TABLE `pickup_points`
  ADD COLUMN `trip_id` int DEFAULT NULL AFTER `id`,
  DROP INDEX `name`,
  ADD UNIQUE KEY `uq_pickup_trip_name` (`trip_id`, `name`),
  ADD KEY `idx_pickup_trip` (`trip_id`);
