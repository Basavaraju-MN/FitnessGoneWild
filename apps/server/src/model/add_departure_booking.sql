-- Departures can be scheduled (weekend) or custom (customised trip).
-- Run once on every database (local and Hostinger).

-- 1. Departures: scheduled (fixed weekend) or custom (customised trip)
ALTER TABLE `departures`
  ADD COLUMN `departure_type` enum('scheduled','custom') NOT NULL DEFAULT 'scheduled' AFTER `end_date`,
  DROP INDEX `uq_departure`,
  ADD UNIQUE KEY `uq_departure` (`trip_id`, `start_date`, `end_date`, `departure_type`),
  ADD KEY `idx_departures_trip` (`trip_id`);

